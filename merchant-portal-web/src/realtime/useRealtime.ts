import { useEffect } from 'react';
import { getSocket } from './socket';

type UseRealtimeOptions = {
  onMerchantCreated?: (payload: any) => void;
  onCustomerCreated?: (payload: any) => void;
};

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { onMerchantCreated, onCustomerCreated } = options;

  useEffect(() => {
    const socket = getSocket();

    const handleMerchant = (payload: any) => {
      console.log('[WS] merchantCreated', payload);
      onMerchantCreated?.(payload);
    };
    const handleCustomer = (payload: any) => {
      console.log('[WS] customerCreated', payload);
      onCustomerCreated?.(payload);
    };

    if (onMerchantCreated) socket.on('merchantCreated', handleMerchant);
    if (onCustomerCreated) socket.on('customerCreated', handleCustomer);

    return () => {
      if (onMerchantCreated) socket.off('merchantCreated', handleMerchant);
      if (onCustomerCreated) socket.off('customerCreated', handleCustomer);
    };
  }, [onMerchantCreated, onCustomerCreated]);
}