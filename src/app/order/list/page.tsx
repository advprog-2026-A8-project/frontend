"use client";

import { useEffect, useState } from "react";

interface Order {
    id: string;
    productId: string;
    userId: string;
    jumlah: number;
    status: string;
    alamatPengiriman: string;
}

export default function OrderListPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch("/api/proxy/orders");
                if (!res.ok) throw new Error("Gagal mengambil data");
                const data = await res.json();
                setOrders(data);
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading)
        return <div className="p-8 text-center">Loading orders...</div>;

    return (
        <div className="min-h-screen p-8">
            <h1 className="text-3xl font-bold mb-6 text-center">Order List</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.length === 0 ? (
                    <p className="text-center w-full">Belum ada order.</p>
                ) : (
                    orders.map((order) => (
                        <div
                            key={order.id}
                            className="border p-4 rounded shadow hover:shadow-lg transition"
                        >
                            <p className="text-sm text-gray-500 mb-1">
                                ID: {order.id}
                            </p>
                            <h2 className="font-bold text-lg">
                                Product: {order.productId}
                            </h2>
                            <p>User: {order.userId}</p>
                            <p>Qty: {order.jumlah}</p>
                            <p>Alamat: {order.alamatPengiriman}</p>
                            <div
                                className={`mt-2 inline-block px-3 py-1 rounded text-white text-sm font-bold 
                    ${
                        order.status === "PAID"
                            ? "bg-green-500"
                            : order.status === "CANCELLED"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                    }`}
                            >
                                {order.status}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
