"use client";
import { useState } from "react";

export default function OrderPage() {
  const [jumlah, setJumlah] = useState(1);
  const [alamat, setAlamat] = useState("");

  const handleCheckout = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumlah, alamatPengiriman: alamat }),
      });

      if (!res.ok) {
        throw new Error(`Gagal checkout! Status: ${res.status}`);
      }

      const data = await res.json();
      alert(`Order dibuat dengan ID: ${data.id} dan Status: ${data.status}`);

      setJumlah(1);
      setAlamat("");
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
        console.error("Error message:", error.message);
      } else {
        alert("Terjadi kesalahan yang tidak diketahui!");
        console.error("Unknown error:", error);
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Buat Pesanan Baru</h1>
      <input
        type="number"
        value={jumlah}
        onChange={(e) => setJumlah(Number(e.target.value))}
        className="border p-2 block mb-2 text-black"
        placeholder="Jumlah"
      />
      <textarea
        value={alamat}
        onChange={(e) => setAlamat(e.target.value)}
        className="border p-2 block mb-2 text-black"
        placeholder="Alamat Pengiriman"
      />
      <button
        onClick={handleCheckout}
        className="bg-blue-500 text-white p-2 rounded"
      >
        Checkout
      </button>
    </div>
  );
}
