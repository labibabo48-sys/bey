"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mockUsers, setCurrentUser, type User, type Role } from "@/lib/mock-data"
import { gql, useLazyQuery } from "@apollo/client" // Import Apollo hooks

const LOGIN_QUERY = gql`
  query Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      success
      message
      token
      user {
        id
        username
        role
        email
        permissions
        photo
      }
    }
  }
`;

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("") // Using as username input
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  // Apollo Lazy Query
  const [login, { loading }] = useLazyQuery(LOGIN_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      const result = data?.login;
      if (result?.success && result?.user) {
        // Map backend user to frontend User type
        const backendUser = result.user;
        const appUser: User = {
          id: backendUser.id,
          zktecoId: "0000", // Default
          name: backendUser.username.toUpperCase(),
          email: backendUser.email || `${backendUser.username}@businessbey.com`,
          role: backendUser.role as Role,
          department: backendUser.role === 'admin' ? "Direction" : "Service",
          salary: 0,
          status: "IN",
          permissions: backendUser.permissions,
          avatar: backendUser.photo
        };

        setCurrentUser(appUser);
        router.push("/");
      } else {
        setError(result?.message || "Échec de la connexion");
      }
    },
    onError: (err) => {
      console.error(err);
      setError("Erreur de connexion au serveur");
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    // Assume input is username or email. Backend expects username.
    // If user types email "admin@bb.com", we might need to strip or backend handles it.
    // For now, let's treat input as username.
    login({ variables: { username: email, password } })
  }



  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Background with coffee/croissant aesthetic */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/osEA8IUzB1BadZySd0AYBEa6WsH1MQLijqiQP~tplv-tiktokx-origin.image?dr=14575&x-expires=1765832400&x-signature=bqBlbf2nRgJaVItDevhaL3bdIhk%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=maliva?q=80&w=2070&auto=format&fit=crop')",
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-md border-2 border-[#c9b896] bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl">
        <div className="mb-6 sm:mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] p-1 shadow-lg">
              <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <Image
                  src="/images/logo.jpeg"
                  alt="Business Bey Logo"
                  width={70}
                  height={70}
                  className="rounded-full object-cover"
                />
              </div>
            </div>
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-[#8b5a2b]">
            Business Bey
          </h1>
          <p className="mt-1 text-base sm:text-lg text-[#a0522d]">l'aouina</p>
          <p className="mt-2 text-sm sm:text-base text-[#6b5744]">Plateforme de Gestion des Employés</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#3d2c1e]">
              Nom d'utilisateur / Email
            </label>
            <Input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin"
              className="bg-[#faf8f5] border-[#c9b896] text-[#3d2c1e] placeholder:text-[#6b5744]/60 h-12 focus:ring-2 focus:ring-[#8b5a2b]/20 transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#3d2c1e]">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-[#faf8f5] border-[#c9b896] text-[#3d2c1e] h-12 focus:ring-2 focus:ring-[#8b5a2b]/20 transition-all"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] text-white hover:from-[#6b4423] hover:to-[#7d3f1e] font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? "Connexion..." : "Se Connecter"}
          </Button>
        </form>


      </Card>
    </div>
  )
}
