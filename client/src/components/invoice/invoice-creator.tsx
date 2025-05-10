import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { debounce } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
}

interface InvoiceCreatorProps {
  onCreateInvoice: (customer: Customer) => void;
}

export default function InvoiceCreator({ onCreateInvoice }: InvoiceCreatorProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [customer, setCustomer] = useState<Customer>({
    id: '',
    name: '',
    phone: '',
    address: '',
    isPotential: true
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Simulate customer search with debounce
  const debouncedSearch = debounce((term: string) => {
    if (!term) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    // In a real app, this would be an API call
    // For demo purposes, create mock results
    setTimeout(() => {
      const mockResults: Customer[] = [
        {
          id: '1',
          name: term.length > 3 ? 'Ahmed Mohamed' : term + ' Ahmed',
          phone: '+20 123 456 7890',
          address: '123 El-Nasr St., Cairo',
          isPotential: false
        },
        {
          id: '2',
          name: term.length > 3 ? 'Sara Ali' : term + ' Sara',
          phone: '+20 111 222 3333',
          address: '45 El-Haram St., Giza',
          isPotential: true
        }
      ];
      
      setSearchResults(mockResults);
      setIsSearching(false);
    }, 500);
  }, 300);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCustomer({
      ...customer,
      name: value
    });
    debouncedSearch(value);
    
    if (value.length > 2) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  const selectCustomer = (selected: Customer) => {
    setCustomer(selected);
    setSearchTerm(selected.name);
    setShowResults(false);
  };

  const handleCreateInvoice = () => {
    if (customer.name.trim() === '') {
      return; // Don't create invoice without a customer name
    }
    
    // Create a customer with the current input (existing or new)
    const customerToSubmit = {
      ...customer,
      id: customer.id || 'new-' + Date.now().toString(), // Generate a temporary ID for new customers
    };
    
    onCreateInvoice(customerToSubmit);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Receipt className="mr-2 h-5 w-5" />
          {t('create_new_invoice')}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form>
          <div className="mb-4">
            <Label htmlFor="customer-name">{t('customer_name')}</Label>
            <div className="relative">
              <Input
                id="customer-name"
                value={searchTerm}
                onChange={handleSearch}
                placeholder={t('enter_or_search_customer_name')}
                className="w-full pr-10"
              />
              <div className="absolute right-2 top-2 text-neutral-500">
                {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              </div>
              
              {/* Search results dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-lg max-h-60 overflow-auto">
                  {searchResults.map(result => (
                    <div 
                      key={result.id}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                      onClick={() => selectCustomer(result)}
                    >
                      <div className="font-medium">{result.name}</div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {result.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="customer-phone">{t('phone')}</Label>
              <Input 
                id="customer-phone"
                value={customer.phone}
                onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                placeholder={t('phone_number')}
              />
            </div>
            <div>
              <Label htmlFor="customer-potential">{t('potential_client')}</Label>
              <Select
                value={customer.isPotential ? 'yes' : 'no'}
                onValueChange={(value) => setCustomer({ ...customer, isPotential: value === 'yes' })}
              >
                <SelectTrigger id="customer-potential">
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('yes')}</SelectItem>
                  <SelectItem value="no">{t('no')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mb-4">
            <Label htmlFor="customer-address">{t('address')}</Label>
            <Input 
              id="customer-address"
              value={customer.address}
              onChange={e => setCustomer({ ...customer, address: e.target.value })}
              placeholder={t('customer_address')}
            />
          </div>
        </form>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          variant="secondary"
          onClick={handleCreateInvoice}
        >
          {t('create_invoice')}
        </Button>
      </CardFooter>
    </Card>
  );
}
