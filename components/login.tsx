'use client'

import { useUser } from '@clerk/nextjs'

import { KeyRound, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";

export default function Login() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    let active = true;

    const routeUser = async () => {
      try {
        const [, setupRes] = await Promise.all([
          axios.post("/api/users/sync").catch(() => null),
          axios.get("/api/setup/status").catch(() => null),
        ]);

        queryClient.invalidateQueries({ queryKey: ["current-db-user", user.id] });

        const needsSetup =
          setupRes?.data &&
          !setupRes.data?.setup_completed &&
          setupRes.data?.counts?.companies === 0 &&
          setupRes.data?.counts?.statuses === 0;

        if (active) {
          router.replace(needsSetup ? "/setup" : "/admin");
        }
      } catch {
        if (active) router.replace("/admin");
      }
    };

    routeUser();
    return () => {
      active = false;
    };
  }, [user, router, queryClient]);
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[0vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }


  if (!user)
    return (
      <div className="flex justify-center gap-8">
        <SignedOut>
          <div className="flex gap-2 justify-center items-center p-6 rounded-full text-[1rem] font-poppins border border-2 dark:border-white border-zinc-300 shadow-md hover:bg-zinc-300 dark:bg-black">
            <KeyRound />

            <SignInButton />
          </div>



          <div className="flex gap-2 justify-center items-center p-6 rounded-full text-[1rem] font-poppins  border border-2 dark:border-white border-zinc-300 shadow-md hover:bg-zinc-300 dark:bg-black">
            <UserPlus />
            <SignUpButton />

          </div>

        </SignedOut>
      </div>
    );
}
