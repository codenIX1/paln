import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const res = await fetch(`${API_URL}/api/auth/nextauth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          })

          if (!res.ok) {
            return null
          }

          const user = await res.json()
          
          if (user && user.accessToken) {
            return {
              id: user.id,
              email: user.email,
              accessToken: user.accessToken,
            }
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }

        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        const userWithToken = user as unknown as { accessToken?: string }
        token.accessToken = userWithToken.accessToken
      }
      return token
    },
    async session({ session, token }) {
      const userWithToken = session.user as unknown as { id?: string; accessToken?: string }
      userWithToken.id = token.id as string
      userWithToken.accessToken = token.accessToken as string
      return session
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-change-in-production",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
