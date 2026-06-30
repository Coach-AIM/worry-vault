import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    // Protect main views
    "/",
    "/journal",
    "/tasks",
    "/vault",
    "/insights",
    "/reflect",
    "/decisions",
  ],
};
