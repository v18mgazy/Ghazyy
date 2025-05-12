import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Truck, Plus, Pencil, Trash2, FileText, Search, MoreHorizontal, DollarSign, Calendar, CalendarClock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// صفحة إدارة الموردين
export default function SuppliersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("suppliers");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // استعلام قائمة الموردين
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });

  // استعلام فواتير الموردين
  const { data: supplierInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/supplier-invoices", selectedSupplier?.id],
    queryFn: async () => {
      if (!selectedSupplier) return [];
      const response = await fetch(`/api/supplier-invoices?supplierId=${selectedSupplier.id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: !!selectedSupplier,
  });

  // استعلام المدفوعات للموردين
  const { data: supplierPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/supplier-payments", selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice) return [];
      const response = await fetch(`/api/supplier-payments?invoiceId=${selectedInvoice.id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: !!selectedInvoice,
  });

  // إضافة مورد جديد
  const supplierFormSchema = z.object({
    name: z.string().min(2, t("supplier_name_min")),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  });

  const supplierForm = useForm({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/suppliers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("supplier_added_successfully"),
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      supplierForm.reset();
      setIsNewSupplierOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("add_supplier_error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // إضافة فاتورة مورد جديدة
  const invoiceFormSchema = z.object({
    invoiceNumber: z.string().min(1, t("invoice_number_required")),
    amount: z.coerce.number().positive(t("amount_must_be_positive")),
    date: z.string().min(1, t("date_required")),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  });

  const invoiceForm = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      notes: "",
    },
  });

  const addInvoiceMutation = useMutation({
    mutationFn: async (data) => {
      const invoiceData = {
        ...data,
        supplierId: selectedSupplier.id,
        paidAmount: 0,
        paymentStatus: "pending",
      };
      const response = await apiRequest("POST", "/api/supplier-invoices", invoiceData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("supplier_invoice_added_successfully"),
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-invoices", selectedSupplier?.id] });
      invoiceForm.reset();
      setIsNewInvoiceOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("add_supplier_invoice_error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // إضافة دفعة لفاتورة مورد
  const paymentFormSchema = z.object({
    amount: z.coerce.number().positive(t("amount_must_be_positive")),
    paymentMethod: z.string().min(1, t("payment_method_required")),
    paymentDate: z.string().min(1, t("date_required")),
    notes: z.string().optional(),
  });

  const paymentForm = useForm({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: "cash",
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (data) => {
      const paymentData = {
        ...data,
        supplierInvoiceId: selectedInvoice.id,
      };
      const response = await apiRequest("POST", "/api/supplier-payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("payment_added_successfully"),
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-invoices", selectedSupplier?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-payments", selectedInvoice?.id] });
      paymentForm.reset();
      setIsPaymentDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("add_payment_error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // الفلترة بناءً على البحث
  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.phone && supplier.phone.includes(searchTerm)) ||
    (supplier.address && supplier.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setActiveTab("invoices");
  };

  const handleAddSupplier = (data) => {
    addSupplierMutation.mutate(data);
  };

  const handleAddInvoice = (data) => {
    addInvoiceMutation.mutate(data);
  };

  const handleAddPayment = (data) => {
    addPaymentMutation.mutate(data);
  };

  const openPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    paymentForm.setValue("amount", invoice.amount - invoice.paidAmount);
    setIsPaymentDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">{t("paid")}</Badge>;
      case "partially_paid":
        return <Badge className="bg-amber-500">{t("partially_paid")}</Badge>;
      case "pending":
      default:
        return <Badge className="bg-red-500">{t("pending")}</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("suppliers_management")} | Sales Ghazy</title>
      </Helmet>

      <div className="container mx-auto p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("suppliers_management")}
            </h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="suppliers" className="text-base">
                <Truck className="mr-2 h-5 w-5" />
                {t("suppliers")}
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-base" disabled={!selectedSupplier}>
                <FileText className="mr-2 h-5 w-5" />
                {t("supplier_invoices")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="suppliers" className="space-y-4">
              <Card className="shadow-md border-primary/20">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>{t("suppliers")}</CardTitle>
                    <Dialog open={isNewSupplierOpen} onOpenChange={setIsNewSupplierOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                          <Plus className="mr-2 h-4 w-4" /> {t("add_supplier")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("add_supplier")}</DialogTitle>
                        </DialogHeader>
                        <Form {...supplierForm}>
                          <form onSubmit={supplierForm.handleSubmit(handleAddSupplier)} className="space-y-4">
                            <FormField
                              control={supplierForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("supplier_name")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t("supplier_name")} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={supplierForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("supplier_phone")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t("supplier_phone")} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={supplierForm.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("supplier_address")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t("supplier_address")} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={supplierForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("supplier_notes")}</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder={t("supplier_notes")} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setIsNewSupplierOpen(false)}>
                                {t("cancel")}
                              </Button>
                              <Button type="submit" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                                {t("add_supplier")}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <CardDescription>
                    {t("suppliers_description")}
                  </CardDescription>
                  <div className="mt-4 relative">
                    <Input
                      placeholder={t("search_suppliers")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-muted/50 bg-muted/10">
                          <TableHead>{t("supplier_name")}</TableHead>
                          <TableHead>{t("supplier_phone")}</TableHead>
                          <TableHead>{t("supplier_address")}</TableHead>
                          <TableHead>{t("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suppliersLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-10">
                              <div className="flex justify-center items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredSuppliers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-10">
                              {t("no_suppliers_found")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSuppliers.map((supplier) => (
                            <TableRow
                              key={supplier.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleSelectSupplier(supplier)}
                            >
                              <TableCell className="font-medium">{supplier.name}</TableCell>
                              <TableCell>{supplier.phone || "--"}</TableCell>
                              <TableCell>{supplier.address || "--"}</TableCell>
                              <TableCell className="w-20">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectSupplier(supplier);
                                    }}>
                                      <FileText className="mr-2 h-4 w-4" />
                                      {t("supplier_invoices")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      // setEditingSupplier(supplier);
                                      // setIsEditSupplierOpen(true);
                                    }}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      {t("edit_supplier")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // setDeletingSupplier(supplier);
                                        // setIsDeleteSupplierOpen(true);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {t("delete_supplier")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              {selectedSupplier && (
                <>
                  <Card className="shadow-md border-primary/20">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>{t("supplier_invoices_list")}</CardTitle>
                          <CardDescription>
                            {selectedSupplier.name} - {selectedSupplier.phone || ""}
                          </CardDescription>
                        </div>
                        <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                              <Plus className="mr-2 h-4 w-4" /> {t("add_supplier_invoice")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("add_supplier_invoice")}</DialogTitle>
                            </DialogHeader>
                            <Form {...invoiceForm}>
                              <form onSubmit={invoiceForm.handleSubmit(handleAddInvoice)} className="space-y-4">
                                <FormField
                                  control={invoiceForm.control}
                                  name="invoiceNumber"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t("supplier_invoice_number")}</FormLabel>
                                      <FormControl>
                                        <Input placeholder={t("supplier_invoice_number")} {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={invoiceForm.control}
                                  name="amount"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t("supplier_invoice_amount")}</FormLabel>
                                      <FormControl>
                                        <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={invoiceForm.control}
                                  name="date"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t("supplier_invoice_date")}</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={invoiceForm.control}
                                  name="dueDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t("supplier_due_date")}</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={invoiceForm.control}
                                  name="notes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t("supplier_invoice_notes")}</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder={t("supplier_invoice_notes")} {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <DialogFooter>
                                  <Button type="button" variant="outline" onClick={() => setIsNewInvoiceOpen(false)}>
                                    {t("cancel")}
                                  </Button>
                                  <Button type="submit" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                                    {t("add_supplier_invoice")}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-muted/50 bg-muted/10">
                              <TableHead>{t("supplier_invoice_number")}</TableHead>
                              <TableHead>{t("supplier_invoice_date")}</TableHead>
                              <TableHead>{t("supplier_invoice_amount")}</TableHead>
                              <TableHead>{t("supplier_paid_amount")}</TableHead>
                              <TableHead>{t("supplier_remaining_amount")}</TableHead>
                              <TableHead>{t("supplier_invoice_status")}</TableHead>
                              <TableHead>{t("supplier_due_date")}</TableHead>
                              <TableHead>{t("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoicesLoading ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-10">
                                  <div className="flex justify-center items-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : supplierInvoices.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-10">
                                  {t("no_supplier_invoices_found")}
                                </TableCell>
                              </TableRow>
                            ) : (
                              supplierInvoices.map((invoice) => (
                                <TableRow key={invoice.id} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                                  <TableCell>{invoice.amount.toFixed(2)} {t("currency")}</TableCell>
                                  <TableCell>{invoice.paidAmount.toFixed(2)} {t("currency")}</TableCell>
                                  <TableCell>{(invoice.amount - invoice.paidAmount).toFixed(2)} {t("currency")}</TableCell>
                                  <TableCell>{getStatusBadge(invoice.paymentStatus)}</TableCell>
                                  <TableCell>
                                    {invoice.dueDate 
                                      ? new Date(invoice.dueDate).toLocaleDateString() 
                                      : "--"}
                                  </TableCell>
                                  <TableCell className="w-20">
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                                        onClick={() => openPaymentDialog(invoice)}
                                        disabled={invoice.paymentStatus === "paid"}
                                      >
                                        <DollarSign className="h-4 w-4" />
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" className="h-8 w-8 p-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => {
                                            setSelectedInvoice(invoice);
                                            // setIsInvoiceDetailsOpen(true);
                                          }}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            {t("invoice_details")}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => {
                                            // setEditingInvoice(invoice);
                                            // setIsEditInvoiceOpen(true);
                                          }}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            {t("edit_supplier_invoice")}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-red-600"
                                            onClick={() => {
                                              // setDeletingInvoice(invoice);
                                              // setIsDeleteInvoiceOpen(true);
                                            }}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {t("delete_supplier_invoice")}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialog for recording payments */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("record_payment")}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="mb-4 p-4 bg-muted rounded-md">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">{t("supplier_invoice_number")}:</span> {selectedInvoice.invoiceNumber}
                </div>
                <div>
                  <span className="font-medium">{t("supplier_invoice_amount")}:</span> {selectedInvoice.amount.toFixed(2)} {t("currency")}
                </div>
                <div>
                  <span className="font-medium">{t("supplier_paid_amount")}:</span> {selectedInvoice.paidAmount.toFixed(2)} {t("currency")}
                </div>
                <div>
                  <span className="font-medium">{t("supplier_remaining_amount")}:</span> {(selectedInvoice.amount - selectedInvoice.paidAmount).toFixed(2)} {t("currency")}
                </div>
              </div>
            </div>
          )}
          
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleAddPayment)} className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">{t("payment_type")}</h3>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={paymentForm.watch("amount") === (selectedInvoice?.amount - selectedInvoice?.paidAmount) ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      if (selectedInvoice) {
                        paymentForm.setValue("amount", selectedInvoice.amount - selectedInvoice.paidAmount);
                      }
                    }}
                  >
                    {t("full_payment")}
                  </Button>
                  <Button
                    type="button"
                    variant={paymentForm.watch("amount") !== (selectedInvoice?.amount - selectedInvoice?.paidAmount) ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      if (selectedInvoice) {
                        paymentForm.setValue("amount", 0);
                      }
                    }}
                  >
                    {t("partial_payment")}
                  </Button>
                </div>
              </div>
              
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("payment_amount")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max={selectedInvoice ? selectedInvoice.amount - selectedInvoice.paidAmount : 0}
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("payment_method")}</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="cash">{t("cash")}</option>
                        <option value="bank_transfer">{t("bank_transfer")}</option>
                        <option value="cheque">{t("cheque")}</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("payment_date")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("payment_notes")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("payment_notes")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                  disabled={!paymentForm.watch("amount")}
                >
                  {t("add_supplier_payment")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}