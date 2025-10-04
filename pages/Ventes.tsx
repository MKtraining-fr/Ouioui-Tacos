import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Table, Order, OrderItem, Product } from '../types';
import { notificationService } from '../services/notificationService';
import TableModal from '../components/TableModal';
import OrderModal from '../components/commande/OrderModal';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface TableCardProps {
  table: Table;
  openOrderModal: (table: Table) => void;
  openEditTableModal: (table: Table) => void;
  handleDeleteTable: (id: string) => void;
  canManageTables: boolean;
  canManageOrders: boolean;
}

const TableCard = React.memo(({ table, openOrderModal, openEditTableModal, handleDeleteTable, canManageTables, canManageOrders }: TableCardProps) => {
  const tableStatusClass = useMemo(() => {
    switch (table.status) {
      case 'occupied':
        return 'bg-red-100 text-red-800';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'available':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, [table.status]);

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between transform transition duration-300 hover:scale-105"
      aria-label={`Table ${table.number}, statut: ${table.status}`}
      tabIndex={0}
    >
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Table {table.number}</h3>
        <p className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${tableStatusClass}`}>
          {table.status === 'occupied' && 'Occupée'}
          {table.status === 'waiting' && 'En attente'}
          {table.status === 'available' && 'Disponible'}
          {table.status === 'cleaning' && 'Nettoyage'}
        </p>
        {table.current_order_id && (
          <p className="text-sm text-gray-600 mt-2">Commande actuelle: {table.current_order_id}</p>
        )}
        {table.couverts && (
          <p className="text-sm text-gray-600">Couverts: {table.couverts}</p>
        )}
      </div>
      <div className="mt-4 flex justify-end space-x-2">
        {canManageOrders && (
          <button
            onClick={() => openOrderModal(table)}
            className="p-2 rounded-full bg-brand-primary text-white hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50"
            aria-label={`Voir ou gérer la commande de la table ${table.number}`}
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        )}
        {canManageTables && (
          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button
                className="inline-flex justify-center w-full rounded-full p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-brand-primary"
                aria-label={`Options pour la table ${table.number}`}
              >
                <PencilIcon className="h-5 w-5" />
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => openEditTableModal(table)}
                        className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} flex px-4 py-2 text-sm w-full text-left`}
                        aria-label={`Modifier les détails de la table ${table.number}`}
                      >
                        <PencilIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                        Modifier la table
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleDeleteTable(table.id)}
                        className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} flex px-4 py-2 text-sm w-full text-left`}
                        aria-label={`Supprimer la table ${table.number}`}
                      >
                        <TrashIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                        Supprimer la table
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        )}
      </div>
    </div>
  );
});

const Ventes: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [currentTable, setCurrentTable] = useState<Table | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalInitialValues, setModalInitialValues] = useState<Partial<Table>>({});
  const [showCouvertsField, setShowCouvertsField] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const tablesPerPage = 12; // Nombre de tables par page

  const canManageTables = role?.permissions?.['/ventes']?.write;
  const canManageOrders = role?.permissions?.['/ventes']?.write; // Assuming same permission for now

  const fetchTables = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const { data, count } = await api.getTables(page * tablesPerPage, tablesPerPage);
      setTables(data || []);
      setTotalPages(Math.ceil((count || 0) / tablesPerPage));
    } catch (err) {
      notificationService.showError("Erreur lors du chargement des tables.");
      setError("Impossible de charger les tables.");
    } finally {
      setLoading(false);
    }
  }, [tablesPerPage]);

  useEffect(() => {
    fetchTables(currentPage);
  }, [fetchTables, currentPage]);

  const handleModalSubmit = useCallback(async (tableData: Partial<Table>) => {
    setLoading(true);
    try {
      if (modalMode === 'add') {
        await api.createTable(tableData);
        notificationService.showSuccess("Table ajoutée avec succès !");
      } else if (currentTable) {
        await api.updateTable(currentTable.id, tableData);
        notificationService.showSuccess("Table mise à jour avec succès !");
      }
      setIsTableModalOpen(false);
      fetchTables(currentPage);
    } catch (err) {
      notificationService.showError("Erreur lors de l'enregistrement de la table.");
    } finally {
      setLoading(false);
    }
  }, [modalMode, currentTable, fetchTables, currentPage]);

  const handleDeleteTable = useCallback(async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette table ?")) {
      setLoading(true);
      try {
        await api.deleteTable(id);
        notificationService.showSuccess("Table supprimée avec succès !");
        fetchTables(currentPage);
      } catch (err) {
        notificationService.showError("Erreur lors de la suppression de la table.");
      } finally {
        setLoading(false);
      }
    }
  }, [fetchTables, currentPage]);

  const openAddTableModal = useCallback(() => {
    setModalMode('add');
    setModalInitialValues({});
    setShowCouvertsField(false);
    setIsTableModalOpen(true);
  }, []);

  const openEditTableModal = useCallback((table: Table) => {
    setModalMode('edit');
    setCurrentTable(table);
    setModalInitialValues(table);
    setShowCouvertsField(true);
    setIsTableModalOpen(true);
  }, []);

  const openOrderModal = useCallback(async (table: Table) => {
    setCurrentTable(table);
    if (table.current_order_id) {
      try {
        const order = await api.getOrderById(table.current_order_id);
        setCurrentOrder(order);
      } catch (err) {
        notificationService.showError("Erreur lors du chargement de la commande.");
        setCurrentOrder(null);
      }
    } else {
      setCurrentOrder(null);
    }
    setIsOrderModalOpen(true);
  }, []);

  const closeOrderModal = useCallback(() => {
    setIsOrderModalOpen(false);
    setCurrentTable(null);
    setCurrentOrder(null);
    fetchTables(currentPage); // Refresh tables after order modal closes
  }, [fetchTables, currentPage]);

  const handleCreateOrder = useCallback(async (tableId: string, couverts: number) => {
    try {
      const newOrder = await api.createOrder(tableId, couverts);
      notificationService.showSuccess("Commande créée avec succès !");
      setCurrentOrder(newOrder);
      fetchTables(currentPage);
    } catch (err) {
      notificationService.showError("Erreur lors de la création de la commande.");
    }
  }, [fetchTables, currentPage]);

  const handleUpdateOrder = useCallback(async (orderId: string, updates: Partial<Order>) => {
    try {
      const updatedOrder = await api.updateOrder(orderId, updates);
      notificationService.showSuccess("Commande mise à jour avec succès !");
      setCurrentOrder(updatedOrder);
      fetchTables(currentPage);
    } catch (err) {
      notificationService.showError("Erreur lors de la mise à jour de la commande.");
    }
  }, [fetchTables, currentPage]);

  const handleAddOrderItem = useCallback(async (orderId: string, productId: string, quantity: number, price: number) => {
    try {
      await api.createOrderItem(orderId, productId, quantity, price);
      notificationService.showSuccess("Article ajouté à la commande !");
      const updatedOrder = await api.getOrderById(orderId);
      setCurrentOrder(updatedOrder);
    } catch (err) {
      notificationService.showError("Erreur lors de l'ajout de l'article à la commande.");
    }
  }, []);

  const handleUpdateOrderItem = useCallback(async (orderItemId: string, updates: Partial<OrderItem>) => {
    try {
      await api.updateOrderItem(orderItemId, updates);
      notificationService.showSuccess("Article de commande mis à jour !");
      if (currentOrder) {
        const updatedOrder = await api.getOrderById(currentOrder.id);
        setCurrentOrder(updatedOrder);
      }
    } catch (err) {
      notificationService.showError("Erreur lors de la mise à jour de l'article de commande.");
    }
  }, [currentOrder]);

  const handleDeleteOrderItem = useCallback(async (orderItemId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet article de la commande ?")) {
      try {
        await api.deleteOrderItem(orderItemId);
        notificationService.showSuccess("Article de commande supprimé !");
        if (currentOrder) {
          const updatedOrder = await api.getOrderById(currentOrder.id);
          setCurrentOrder(updatedOrder);
        }
      } catch (err) {
        notificationService.showError("Erreur lors de la suppression de l'article de commande.");
      }
    }
  }, [currentOrder]);

  const handleUpdateOrderItemStatus = useCallback(async (orderItemId: string, status: string) => {
    try {
      await api.updateOrderItemStatus(orderItemId, status);
      notificationService.showSuccess("Statut de l'article mis à jour !");
      if (currentOrder) {
        const updatedOrder = await api.getOrderById(currentOrder.id);
        setCurrentOrder(updatedOrder);
      }
    } catch (err) {
      notificationService.showError("Erreur lors de la mise à jour du statut de l'article.");
    }
  }, [currentOrder]);

  const handleUpdateOrderKitchenStatus = useCallback(async (orderId: string, status: string) => {
    try {
      await api.updateOrderKitchenStatus(orderId, status);
      notificationService.showSuccess("Statut de la cuisine mis à jour !");
      if (currentOrder) {
        const updatedOrder = await api.getOrderById(currentOrder.id);
        setCurrentOrder(updatedOrder);
      }
    } catch (err) {
      notificationService.showError("Erreur lors de la mise à jour du statut de la cuisine.");
    }
  }, [currentOrder]);

  const handleUpdateOrderStatus = useCallback(async (orderId: string, status: string) => {
    try {
      await api.updateOrderStatus(orderId, status);
      notificationService.showSuccess("Statut de la commande mis à jour !");
      if (currentOrder) {
        const updatedOrder = await api.getOrderById(currentOrder.id);
        setCurrentOrder(updatedOrder);
      }
      fetchTables(currentPage);
    } catch (err) {
      notificationService.showError("Erreur lors de la mise à jour du statut de la commande.");
    }
  }, [currentOrder, fetchTables, currentPage]);

  const handleUpdateOrderPaymentStatus = useCallback(async (orderId: string, status: string) => {
    try {
      await api.updateOrderPaymentStatus(orderId, status);
      notificationService.showSuccess("Statut de paiement mis à jour !");
      if (currentOrder) {
        const updatedOrder = await api.getOrderById(currentOrder.id);
        setCurrentOrder(updatedOrder);
      }
    } catch (err) {
      notificationService.showError("Erreur lors de la mise à jour du statut de paiement.");
    }
  }, [currentOrder]);

  const handleLinkOrderToTable = useCallback(async (orderId: string, tableId: string) => {
    try {
      await api.linkOrderToTable(orderId, tableId);
      notificationService.showSuccess("Commande liée à la table avec succès !");
      fetchTables(currentPage);
    } catch (err) {
      notificationService.showError("Erreur lors de la liaison de la commande à la table.");
    }
  }, [fetchTables, currentPage]);

  const handleUnlinkOrderFromTable = useCallback(async (tableId: string) => {
    try {
      await api.unlinkOrderFromTable(tableId);
      notificationService.showSuccess("Commande dissociée de la table avec succès !");
      fetchTables(currentPage);
    } catch (err) {
      notificationService.showError("Erreur lors de la dissociation de la commande de la table.");
    }
  }, [fetchTables, currentPage]);

  if (loading) {
    return <div className="text-center py-8">Chargement des tables...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestion des Ventes</h1>

      <div className="flex justify-end mb-6">
        {canManageTables && (
          <button
            onClick={openAddTableModal}
            className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50"
            aria-label="Ajouter une nouvelle table"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Ajouter Table
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.length > 0 ? (
          tables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              openOrderModal={openOrderModal}
              openEditTableModal={openEditTableModal}
              handleDeleteTable={handleDeleteTable}
              canManageTables={canManageTables}
              canManageOrders={canManageOrders}
            />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">Aucune table trouvée.</p>
        )}
      </div>

      <div className="flex justify-center mt-6">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i)}
            className={`mx-1 px-3 py-1 rounded-md ${currentPage === i ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <TableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialValues={modalInitialValues}
        mode={modalMode}
        showCouvertsField={showCouvertsField}
      />

      {isOrderModalOpen && currentTable && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={closeOrderModal}
          table={currentTable}
          order={currentOrder}
          onCreateOrder={handleCreateOrder}
          onUpdateOrder={handleUpdateOrder}
          onAddOrderItem={handleAddOrderItem}
          onUpdateOrderItem={handleUpdateOrderItem}
          onDeleteOrderItem={handleDeleteOrderItem}
          onUpdateOrderItemStatus={handleUpdateOrderItemStatus}
          onUpdateOrderKitchenStatus={handleUpdateOrderKitchenStatus}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateOrderPaymentStatus={handleUpdateOrderPaymentStatus}
          onLinkOrderToTable={handleLinkOrderToTable}
          onUnlinkOrderFromTable={handleUnlinkOrderFromTable}
        />
      )}
    </div>
  );
};

export default Ventes;

