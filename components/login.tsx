import { useUser } from "@auth0/nextjs-auth0/client";
import { Button } from "@/components/ui/button";
import { KeyRound, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";



export default function Login() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/admin");
    }
  }, [user, router]);
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[0vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user)
    return (
      <div className="flex justify-center gap-8">
        <a href="/api/auth/login">
          <Button className="flex gap-2 justify-center items-center p-6 rounded-full text-[1rem] font-poppins">
            <KeyRound />
            <span>Login</span>
          </Button>
        </a>
        <a href="/api/auth/signup">
          <Button className="flex gap-2 justify-center items-center p-6 rounded-full text-[1rem] font-poppins">
            <UserPlus />
            <span>Signup</span>
          </Button>
        </a>
      </div>
    );
}
