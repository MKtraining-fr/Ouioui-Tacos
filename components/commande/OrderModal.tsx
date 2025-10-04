import React from 'react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: any; // Replace 'any' with actual Table type
  order: any; // Replace 'any' with actual Order type
  onCreateOrder: (tableId: string, couverts: number) => void;
  onUpdateOrder: (orderId: string, updates: any) => void; // Replace 'any' with actual Partial<Order> type
  onAddOrderItem: (orderId: string, productId: string, quantity: number, price: number) => void;
  onUpdateOrderItem: (orderItemId: string, updates: any) => void; // Replace 'any' with actual Partial<OrderItem> type
  onDeleteOrderItem: (orderItemId: string) => void;
  onUpdateOrderItemStatus: (orderItemId: string, status: string) => void;
  onUpdateOrderKitchenStatus: (orderId: string, status: string) => void;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
  onUpdateOrderPaymentStatus: (orderId: string, status: string) => void;
  onLinkOrderToTable: (orderId: string, tableId: string) => void;
  onUnlinkOrderFromTable: (tableId: string) => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, table, order, onCreateOrder, onUpdateOrder, onAddOrderItem, onUpdateOrderItem, onDeleteOrderItem, onUpdateOrderItemStatus, onUpdateOrderKitchenStatus, onUpdateOrderStatus, onUpdateOrderPaymentStatus, onLinkOrderToTable, onUnlinkOrderFromTable }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Commande pour la table {table.number}</h3>
          <div className="mt-2 px-7 py-3">
            {/* Placeholder for order details and actions */}
            <p className="text-sm text-gray-500">Contenu de la commande ici...</p>
            {order ? (
              <div>
                <p>Order ID: {order.id}</p>
                {/* More order details */}
              </div>
            ) : (
              <button onClick={() => onCreateOrder(table.id, 1)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">Créer une nouvelle commande</button>
            )}
          </div>
          <div className="items-center px-4 py-3">
            <button
              id="ok-btn"
              onClick={onClose}
              className="px-4 py-2 bg-brand-primary text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderModal;

