import { withAuth } from "next-auth/middleware";

export default withAuth({
    pages: {
        signIn: "/",
    },
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
});

export const config = {
    matcher: [
        "/dashboard",
        "/dashboard/:path*",
    ],
};
