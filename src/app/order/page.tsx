"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function OrderPage() {
    const [formData, setFormData] = useState({
        productId: "",
        userId: "",
        jumlah: 1,
        alamatPengiriman: "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/proxy/orders/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    productId: formData.productId,
                    userId: formData.userId,
                    jumlah: Number(formData.jumlah),
                    alamatPengiriman: formData.alamatPengiriman,
                }),
            });

            if (!res.ok) throw new Error("Gagal membuat order");

            const data = await res.json();
            setMessage(`Sukses! Order ID: ${data.id} - Status: ${data.status}`);
        } catch (error) {
            setMessage("Terjadi kesalahan saat order.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1 className="text-2xl font-bold mb-6">Create New Order</h1>

            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md flex flex-col gap-4 p-4 border rounded shadow"
            >
                <input
                    name="userId"
                    placeholder="User ID"
                    value={formData.userId}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    required
                />

                <input
                    name="productId"
                    placeholder="Product ID"
                    value={formData.productId}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    required
                />

                <input
                    name="jumlah"
                    type="number"
                    min="1"
                    placeholder="Jumlah"
                    value={formData.jumlah}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    required
                />

                <input
                    name="alamatPengiriman"
                    placeholder="Alamat Pengiriman"
                    value={formData.alamatPengiriman}
                    onChange={handleChange}
                    className="border p-2 rounded"
                    required
                />

                <Button type="submit" disabled={loading}>
                    {loading ? "Processing..." : "Checkout"}
                </Button>

                {message && (
                    <p className="mt-4 text-center text-sm font-semibold">
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
}
