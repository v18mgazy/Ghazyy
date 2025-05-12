import React, { useState, useMemo } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Truck, Plus, Pencil, Trash2, FileText, Search, MoreHorizontal, DollarSign, Calendar, CalendarClock, Loader2 } from "lucide-react";
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
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // استعلام قائمة الموردين
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<any[]>({
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

  // استعلام المدفوعات للموردين (لفاتورة محددة)
  const { data: selectedInvoicePayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/supplier-payments", "by-invoice", selectedInvoice?.id],
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
  
  // استعلام جميع المدفوعات للمورد المحدد حاليًا
  const { data: allSupplierPayments = [], isLoading: allPaymentsLoading } = useQuery({
    queryKey: ["/api/supplier-payments", "by-supplier", selectedSupplier?.id],
    queryFn: async () => {
      if (!selectedSupplier) return [];
      
      // احضر جميع فواتير المورد أولاً
      const invoicesResponse = await fetch(`/api/supplier-invoices?supplierId=${selectedSupplier.id}`);
      if (!invoicesResponse.ok) {
        throw new Error("Network response was not ok");
      }
      const invoices = await invoicesResponse.json();
      
      // احضر جميع المدفوعات لكل فاتورة
      const payments = [];
      for (const invoice of invoices) {
        const paymentsResponse = await fetch(`/api/supplier-payments?invoiceId=${invoice.id}`);
        if (paymentsResponse.ok) {
          const invoicePayments = await paymentsResponse.json();
          // أضف معلومات الفاتورة إلى كل دفعة
          const paymentsWithInvoiceInfo = invoicePayments.map(payment => ({
            ...payment,
            invoiceNumber: invoice.invoiceNumber,
            invoiceAmount: invoice.amount
          }));
          payments.push(...paymentsWithInvoiceInfo);
        }
      }
      
      // رتب المدفوعات من الأحدث للأقدم
      return payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    },
    enabled: !!selectedSupplier,
  });
  
  // احضار بيانات المدفوعات والفواتير لجميع الموردين
  const { data: allSuppliersSummary = [], isLoading: suppliersPaymentsLoading } = useQuery<any[]>({
    queryKey: ["/api/suppliers/summary"],
    queryFn: async () => {
      // نحضر جميع الموردين
      const suppliersResponse = await fetch("/api/suppliers");
      if (!suppliersResponse.ok) {
        throw new Error("Network response was not ok");
      }
      const suppliers = await suppliersResponse.json();
      
      // نحضر ملخص بيانات المدفوعات لكل مورد
      const suppliersWithSummary = await Promise.all(
        suppliers.map(async (supplier: any) => {
          try {
            // نحضر جميع فواتير المورد
            const invoicesResponse = await fetch(`/api/supplier-invoices?supplierId=${supplier.id}`);
            if (!invoicesResponse.ok) return { ...supplier, totalAmount: 0, totalPaid: 0, totalRemaining: 0 };
            
            const invoices = await invoicesResponse.json();
            // دائمًا نحسب الإجمالي حتى لو كانت القائمة فارغة
            const totalAmount = invoices.length > 0 
              ? invoices.reduce((sum: number, invoice: any) => sum + (invoice.amount || 0), 0)
              : 0;
            
            // نحضر جميع المدفوعات لكل فاتورة
            let totalPaid = 0;
            for (const invoice of invoices) {
              const paymentsResponse = await fetch(`/api/supplier-payments?invoiceId=${invoice.id}`);
              if (paymentsResponse.ok) {
                const payments = await paymentsResponse.json();
                const invoicePaid = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
                totalPaid += invoicePaid;
              }
            }
            
            // حساب المبلغ المتبقي
            const totalRemaining = totalAmount - totalPaid;
            
            return {
              ...supplier,
              totalAmount,
              totalPaid,
              totalRemaining
            };
          } catch (error) {
            console.error(`Error fetching data for supplier ${supplier.id}:`, error);
            return { ...supplier, totalAmount: 0, totalPaid: 0, totalRemaining: 0 };
          }
        })
      );
      
      return suppliersWithSummary;
    }
  });

  // إضافة مورد جديد
  const supplierFormSchema = z.object({
    name: z.string().min(2, t("supplier_name_min")),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  });

  const supplierForm = useForm<z.infer<typeof supplierFormSchema>>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  // إضافة فاتورة مورد جديدة
  const invoiceFormSchema = z.object({
    invoiceNumber: z.string().min(1, t("invoice_number_required")),
    amount: z.number().min(0.01, t("amount_positive")),
    date: z.date(),
    dueDate: z.date().optional().nullable(),
    notes: z.string().optional(),
  });

  const invoiceForm = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      amount: 0,
      date: new Date(),
      dueDate: null,
      notes: "",
    },
  });

  // إضافة دفعة جديدة
  const paymentFormSchema = z.object({
    amount: z.number().min(0.01, t("amount_positive")),
    paymentDate: z.date(),
    paymentMethod: z.enum(["cash", "bank_transfer", "cheque"], {
      required_error: t("payment_method_required"),
    }),
    notes: z.string().optional(),
  });

  const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: "cash",
      notes: "",
    },
  });

  // تصفية الموردين حسب البحث
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;
    return suppliers.filter((supplier) => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.phone && supplier.phone.includes(searchTerm)) ||
      (supplier.address && supplier.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [suppliers, searchTerm]);
  
  // حساب الإحصائيات الإجمالية لجميع الموردين
  const allSuppliersTotals = useMemo(() => {
    if (!allSuppliersSummary || allSuppliersSummary.length === 0) {
      return {
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0
      };
    }
    
    return allSuppliersSummary.reduce((totals, supplier) => {
      return {
        totalAmount: totals.totalAmount + (supplier.totalAmount || 0),
        totalPaid: totals.totalPaid + (supplier.totalPaid || 0),
        totalRemaining: totals.totalRemaining + (supplier.totalRemaining || 0)
      };
    }, { totalAmount: 0, totalPaid: 0, totalRemaining: 0 });
  }, [allSuppliersSummary]);

  // إضافة مورد جديد
  const addSupplierMutation = useMutation({
    mutationFn: async (data: z.infer<typeof supplierFormSchema>) => {
      const response = await apiRequest("POST", "/api/suppliers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsNewSupplierOpen(false);
      supplierForm.reset();
      toast({
        title: t("supplier_added"),
        description: t("supplier_added_success"),
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: t("supplier_add_error"),
        variant: "destructive",
      });
    },
  });
  
  // حذف مورد
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/suppliers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      if (selectedSupplier && selectedSupplier.id === deletingSupplier?.id) {
        setSelectedSupplier(null);
        setActiveTab("suppliers");
      }
      setIsDeleteSupplierOpen(false);
      setDeletingSupplier(null);
      toast({
        title: t("success"),
        description: t("supplier_deleted_successfully"),
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: t("delete_supplier_error"),
        variant: "destructive",
      });
    },
  });

  // إضافة فاتورة مورد جديدة
  const addInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceFormSchema>) => {
      if (!selectedSupplier) throw new Error("No supplier selected");
      const invoiceData = {
        ...data,
        supplierId: selectedSupplier.id,
        paymentStatus: "pending",
        paidAmount: 0,
      };
      const response = await apiRequest("POST", "/api/supplier-invoices", invoiceData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-invoices", selectedSupplier?.id] });
      setIsNewInvoiceOpen(false);
      invoiceForm.reset();
      toast({
        title: t("invoice_added"),
        description: t("invoice_added_success"),
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: t("invoice_add_error"),
        variant: "destructive",
      });
    },
  });

  // إضافة دفعة جديدة
  const addPaymentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof paymentFormSchema>) => {
      if (!selectedInvoice) throw new Error("No invoice selected");
      const paymentData = {
        ...data,
        supplierInvoiceId: selectedInvoice.id,
      };
      const response = await apiRequest("POST", "/api/supplier-payments", paymentData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-payments", "by-invoice", selectedInvoice?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-payments", "by-supplier", selectedSupplier?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-invoices", selectedSupplier?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/summary"] });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
      toast({
        title: t("payment_added"),
        description: t("payment_added_success"),
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: t("payment_add_error"),
        variant: "destructive",
      });
    },
  });

  // اختيار مورد
  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
  };

  // اختيار فاتورة
  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
  };

  // تقديم نموذج المورد الجديد
  const handleAddSupplier = (data) => {
    addSupplierMutation.mutate(data);
  };

  // تقديم نموذج الفاتورة الجديدة
  const handleAddInvoice = (data) => {
    addInvoiceMutation.mutate(data);
  };

  // تقديم نموذج الدفع الجديد
  const handleAddPayment = (data) => {
    addPaymentMutation.mutate(data);
  };

  // حالة الدفع للفاتورة
  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return {
          variant: "success",
          label: t("paid"),
          icon: <DollarSign className="h-4 w-4 mr-1" />,
        };
      case "partially_paid":
        return {
          variant: "warning",
          label: t("partially_paid"),
          icon: <DollarSign className="h-4 w-4 mr-1" />,
        };
      default:
        return {
          variant: "destructive",
          label: t("pending"),
          icon: <Calendar className="h-4 w-4 mr-1" />,
        };
    }
  };

  // حساب إجماليات الفواتير والمدفوعات
  const invoiceSummary = useMemo(() => {
    if (!supplierInvoices.length) {
      return {
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        invoiceCount: 0,
      };
    }

    const totalAmount = supplierInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const totalPaid = supplierInvoices.reduce((sum, invoice) => sum + (invoice.paidAmount || 0), 0);

    return {
      totalAmount,
      totalPaid,
      totalRemaining: totalAmount - totalPaid,
      invoiceCount: supplierInvoices.length,
    };
  }, [supplierInvoices]);

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
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="suppliers" className="text-base">
                <Truck className="mr-2 h-5 w-5" />
                {t("suppliers")}
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-base" disabled={!selectedSupplier}>
                <FileText className="mr-2 h-5 w-5" />
                {t("supplier_invoices")}
              </TabsTrigger>
              <TabsTrigger value="payments_report" className="text-base" disabled={!selectedSupplier}>
                <CalendarClock className="mr-2 h-5 w-5" />
                {t("supplier_payments_report")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="suppliers" className="space-y-4">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-4">
                <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <div className="text-muted-foreground text-sm mb-1">{t("total_invoices_amount")}</div>
                      <div className="text-2xl font-bold">{allSuppliersTotals.totalAmount.toLocaleString()} {t("currency")}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <div className="text-muted-foreground text-sm mb-1">{t("total_paid_amount")}</div>
                      <div className="text-2xl font-bold text-green-600">{allSuppliersTotals.totalPaid.toLocaleString()} {t("currency")}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-red-500/10 to-red-600/10 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <div className="text-muted-foreground text-sm mb-1">{t("total_remaining_amount")}</div>
                      <div className="text-2xl font-bold text-red-600">{allSuppliersTotals.totalRemaining.toLocaleString()} {t("currency")}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            
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
                                  <FormLabel>{t("notes")}</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder={t("notes")} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button 
                                type="submit" 
                                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                                disabled={addSupplierMutation.isPending}
                              >
                                {addSupplierMutation.isPending ? (
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {t("saving")}
                                  </div>
                                ) : (
                                  t("save")
                                )}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="relative">
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
                          <TableHead>{t("total_amount")}</TableHead>
                          <TableHead>{t("total_paid")}</TableHead>
                          <TableHead>{t("total_remaining")}</TableHead>
                          <TableHead>{t("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suppliersLoading || suppliersPaymentsLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-10">
                              <div className="flex justify-center items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredSuppliers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-10">
                              {t("no_suppliers_found")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSuppliers.map((supplier) => {
                            // ابحث عن بيانات الملخص لهذا المورد
                            const supplierSummary = allSuppliersSummary.find((s) => s.id === supplier.id) || {
                              totalAmount: 0,
                              totalPaid: 0,
                              totalRemaining: 0
                            };
                            
                            return (
                              <TableRow
                                key={supplier.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSelectSupplier(supplier)}
                              >
                                <TableCell className="font-medium">{supplier.name}</TableCell>
                                <TableCell>{supplier.phone || "--"}</TableCell>
                                <TableCell>{supplier.address || "--"}</TableCell>
                                <TableCell className="font-semibold">{supplierSummary.totalAmount.toLocaleString()} {t("currency")}</TableCell>
                                <TableCell className="text-green-600 font-semibold">{supplierSummary.totalPaid.toLocaleString()} {t("currency")}</TableCell>
                                <TableCell className="text-red-600 font-semibold">{supplierSummary.totalRemaining.toLocaleString()} {t("currency")}</TableCell>
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
                                        setActiveTab("invoices");
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
                                          setDeletingSupplier(supplier);
                                          setIsDeleteSupplierOpen(true);
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t("delete_supplier")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
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
                        <CardTitle>
                          {t("supplier_invoices")} - {selectedSupplier.name}
                        </CardTitle>
                        <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                              <Plus className="mr-2 h-4 w-4" /> {t("add_invoice")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("add_invoice")}</DialogTitle>
                            </DialogHeader>
                            <Form {...invoiceForm}>
                              <form onSubmit={invoiceForm.handleSubmit(handleAddInvoice)} className="space-y-4">
                                <FormField
                                  control={invoiceForm.control}
                                  name="invoiceNumber"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t("invoice_number")}</FormLabel>
                                      <FormControl>
                                        <Input placeholder={t("invoice_number")} {...field} />
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
                                      <FormLabel>{t("amount")}</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="0.01"
                                          step="0.01"
                                          placeholder={t("amount")}
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                        />
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
                                      <FormLabel>{t("date")}</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="date"
                                          placeholder={t("date")}
                                          {...field}
                                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                                          onChange={(e) => field.onChange(new Date(e.target.value))}
                                        />
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
                                      <FormLabel>{t("due_date")}</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="date"
                                          placeholder={t("due_date")}
                                          {...field}
                                          value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : '') : ''}
                                          onChange={(e) => e.target.value ? field.onChange(new Date(e.target.value)) : field.onChange(null)}
                                        />
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
                                      <FormLabel>{t("notes")}</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder={t("notes")} {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <DialogFooter>
                                  <Button 
                                    type="submit" 
                                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                                    disabled={addInvoiceMutation.isPending}
                                  >
                                    {addInvoiceMutation.isPending ? (
                                      <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        {t("saving")}
                                      </div>
                                    ) : (
                                      t("save")
                                    )}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
                        <Card className="bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex flex-col">
                              <div className="text-muted-foreground text-sm mb-1">{t("total_invoices")}</div>
                              <div className="text-2xl font-bold">{invoiceSummary.invoiceCount}</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex flex-col">
                              <div className="text-muted-foreground text-sm mb-1">{t("total_amount")}</div>
                              <div className="text-2xl font-bold">{invoiceSummary.totalAmount.toLocaleString()} {t("currency")}</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex flex-col">
                              <div className="text-muted-foreground text-sm mb-1">{t("total_paid_amount")}</div>
                              <div className="text-2xl font-bold text-green-600">{invoiceSummary.totalPaid.toLocaleString()} {t("currency")}</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex flex-col">
                              <div className="text-muted-foreground text-sm mb-1">{t("remaining_balance")}</div>
                              <div className="text-2xl font-bold text-red-600">{invoiceSummary.totalRemaining.toLocaleString()} {t("currency")}</div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-muted/50 bg-muted/10">
                              <TableHead>{t("invoice_number")}</TableHead>
                              <TableHead>{t("date")}</TableHead>
                              <TableHead>{t("due_date")}</TableHead>
                              <TableHead>{t("amount")}</TableHead>
                              <TableHead>{t("paid_amount")}</TableHead>
                              <TableHead>{t("remaining")}</TableHead>
                              <TableHead>{t("status")}</TableHead>
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
                              supplierInvoices.map((invoice) => {
                                const statusBadge = getPaymentStatusBadge(invoice.paymentStatus);
                                const remaining = invoice.amount - (invoice.paidAmount || 0);
                                
                                return (
                                  <TableRow
                                    key={invoice.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSelectInvoice(invoice)}
                                  >
                                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                    <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "--"}</TableCell>
                                    <TableCell>{invoice.amount.toLocaleString()} {t("currency")}</TableCell>
                                    <TableCell className="text-green-600">{(invoice.paidAmount || 0).toLocaleString()} {t("currency")}</TableCell>
                                    <TableCell className="text-red-600">{remaining.toLocaleString()} {t("currency")}</TableCell>
                                    <TableCell>
                                      <Badge
                                        className="flex items-center w-fit"
                                        variant={statusBadge.variant}
                                      >
                                        {statusBadge.icon}
                                        {statusBadge.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="w-20">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                          <Button variant="ghost" className="h-8 w-8 p-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSelectInvoice(invoice);
                                              setIsPaymentDialogOpen(true);
                                            }}
                                          >
                                            <DollarSign className="mr-2 h-4 w-4" />
                                            {t("add_payment")}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            // setEditingInvoice(invoice);
                                            // setIsEditInvoiceOpen(true);
                                          }}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            {t("edit_invoice")}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-red-600"
                                            onClick={() => {
                                              // setDeletingInvoice(invoice);
                                              // setIsDeleteInvoiceOpen(true);
                                            }}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {t("delete_invoice")}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="payments_report" className="space-y-4">
              {selectedSupplier && (
                <>
                  <Card className="shadow-md border-primary/20">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                      <CardTitle>
                        {t("supplier_payments_report")} - {selectedSupplier.name}
                      </CardTitle>
                      <CardDescription>
                        {t("supplier_details")}: {selectedSupplier.phone || "--"} | {selectedSupplier.address || "--"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
                        <Card className="bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex flex-col">
                              <div className="text-muted-foreground text-sm mb-1">{t("total_invoices")}</div>
                              <div className="text-2xl font-bold">{invoiceSummary.invoiceCount}</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex flex-col">
                              <div className="text-muted-foreground text-sm mb-1">{t("total_amount")}</div>
                              <div className="text-2xl font-bold">{invoiceSummary.totalAmount.toLocaleString()} {t("currency")}</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex flex-col">
                              <div className="text-muted-foreground text-sm mb-1">{t("total_paid_amount")}</div>
                              <div className="text-2xl font-bold text-green-600">{invoiceSummary.totalPaid.toLocaleString()} {t("currency")}</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex flex-col">
                              <div className="text-muted-foreground text-sm mb-1">{t("remaining_balance")}</div>
                              <div className="text-2xl font-bold text-red-600">{invoiceSummary.totalRemaining.toLocaleString()} {t("currency")}</div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">{t("detailed_payment_history")}</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-muted/50 bg-muted/10">
                                <TableHead>{t("invoice_number")}</TableHead>
                                <TableHead>{t("payment_date")}</TableHead>
                                <TableHead>{t("payment_method")}</TableHead>
                                <TableHead>{t("payment_amount")}</TableHead>
                                <TableHead>{t("payment_notes")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allPaymentsLoading ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-10">
                                    <div className="flex justify-center items-center">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : allSupplierPayments.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-10">
                                    <div className="flex flex-col items-center">
                                      <div className="text-muted-foreground mb-2">{t("no_payments_found")}</div>
                                      <div className="text-sm text-muted-foreground">{t("no_payments_found_description")}</div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                allSupplierPayments.map((payment) => (
                                  <TableRow key={payment.id}>
                                    <TableCell className="font-medium">{payment.invoiceNumber}</TableCell>
                                    <TableCell>{new Date(payment.paymentDate).toLocaleDateString()} {new Date(payment.paymentDate).toLocaleTimeString()}</TableCell>
                                    <TableCell>{t(payment.paymentMethod)}</TableCell>
                                    <TableCell className="text-green-600 font-semibold">
                                      {payment.amount.toLocaleString()} {t("currency")}
                                    </TableCell>
                                    <TableCell>{payment.notes || "--"}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="flex justify-end items-center text-sm text-muted-foreground mt-4">
                        <div>{t("last_updated")}: {new Date().toLocaleString()}</div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/20 flex justify-end">
                      <Button variant="outline" className="mr-2" onClick={() => window.print()}>
                        <FileText className="mr-2 h-4 w-4" />
                        {t("print_report")}
                      </Button>
                    </CardFooter>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* مربع حوار إضافة دفعة جديدة */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("add_payment")} - {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">{t("amount")}:</span>
                <span className="font-semibold">{selectedInvoice.amount.toLocaleString()} {t("currency")}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">{t("paid_amount")}:</span>
                <span className="font-semibold text-green-600">{(selectedInvoice.paidAmount || 0).toLocaleString()} {t("currency")}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">{t("remaining")}:</span>
                <span className="font-semibold text-red-600">
                  {(selectedInvoice.amount - (selectedInvoice.paidAmount || 0)).toLocaleString()} {t("currency")}
                </span>
              </div>
              <div className="flex gap-2 mb-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (selectedInvoice) {
                      paymentForm.setValue("amount", selectedInvoice.amount - selectedInvoice.paidAmount);
                    }
                  }}
                >
                  {t("pay_full_amount")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (selectedInvoice) {
                      paymentForm.setValue("amount", 0);
                    }
                  }}
                >
                  {t("custom_amount")}
                </Button>
              </div>
            </div>
          )}
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleAddPayment)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("payment_amount")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder={t("payment_amount")}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
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
                      <Input
                        type="datetime-local"
                        placeholder={t("payment_date")}
                        {...field}
                        value={field.value instanceof Date ? field.value.toISOString().slice(0, -8) : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
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
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        className={`bg-green-600 hover:bg-green-700 text-white ${field.value === "cash" ? "ring-2 ring-offset-2 ring-green-600" : ""}`}
                        onClick={() => paymentForm.setValue("paymentMethod", "cash")}
                      >
                        {t("cash")}
                      </Button>
                      <Button
                        type="button"
                        className={`bg-blue-600 hover:bg-blue-700 text-white ${field.value === "bank_transfer" ? "ring-2 ring-offset-2 ring-blue-600" : ""}`}
                        onClick={() => paymentForm.setValue("paymentMethod", "bank_transfer")}
                      >
                        {t("bank_transfer")}
                      </Button>
                      <Button
                        type="button"
                        className={`bg-purple-600 hover:bg-purple-700 text-white ${field.value === "cheque" ? "ring-2 ring-offset-2 ring-purple-600" : ""}`}
                        onClick={() => paymentForm.setValue("paymentMethod", "cheque")}
                      >
                        {t("cheque")}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notes")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("payment_notes")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  disabled={addPaymentMutation.isPending}
                >
                  {addPaymentMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t("saving")}
                    </div>
                  ) : (
                    t("save")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* مربع حوار حذف المورد */}
      <AlertDialog 
        open={isDeleteSupplierOpen} 
        onOpenChange={setIsDeleteSupplierOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{t("delete_supplier")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_supplier_confirmation")} <span className="font-bold">{deletingSupplier?.name}</span>؟
              <br /><br />
              <span className="text-destructive font-medium">{t("delete_supplier_warning")}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingSupplier?.id) {
                  deleteSupplierMutation.mutate(deletingSupplier.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSupplierMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}