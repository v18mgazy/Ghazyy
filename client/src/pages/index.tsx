import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BarcodeScanner from '@/components/barcode-scanner';
import InvoiceCreator from '@/components/invoice/invoice-creator';
import ActiveInvoice from '@/components/invoice/active-invoice';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  code?: string;
  purchasePrice: number;
  sellingPrice: number;
}

export default function SalesPage() {
  const { t } = useTranslation();
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  
  const handleCustomerSelected = (customer: Customer) => {
    setActiveCustomer(customer);
  };
  
  const handleProductScanned = (product: Product) => {
    setLastScannedProduct(product);
    setShowScanner(false);
  };
  
  const handleCloseInvoice = () => {
    setActiveCustomer(null);
    setShowScanner(false);
  };
  
  const handleActivateScanner = () => {
    setShowScanner(true);
  };
  
  return (
    <div className="space-y-6">
      {!activeCustomer ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Barcode Scanner Section */}
          <BarcodeScanner onProductScanned={handleProductScanned} />
          
          {/* Create New Invoice Section */}
          <InvoiceCreator onCreateInvoice={handleCustomerSelected} />
        </div>
      ) : (
        /* Active Invoice */
        <>
          {showScanner && (
            <div className="mb-6">
              <BarcodeScanner onProductScanned={handleProductScanned} />
            </div>
          )}
          <ActiveInvoice 
            customer={activeCustomer} 
            onClose={handleCloseInvoice}
            onAddProduct={handleActivateScanner}
          />
        </>
      )}
    </div>
  );
}
