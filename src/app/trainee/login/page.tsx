"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TraineeLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (username === "soroush" && password === "soroush") {
        router.push("/trainee/today");   // ✅ go to the dashboard
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="flex flex-col items-center mt-20">
      <h1 className="text-2xl font-bold mb-4">Trainee Login</h1>

      <form onSubmit={handleLogin} className="flex flex-col w-64 gap-3">
        <input
          type="text"
          placeholder="Username"
          className="border px-3 py-2 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="border px-3 py-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="bg-blue-600 text-white py-2 rounded">
          Login
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </div>
  );
}