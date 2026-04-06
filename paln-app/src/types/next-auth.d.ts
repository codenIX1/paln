import "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    accessToken?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      accessToken?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    accessToken?: string
  }
}
