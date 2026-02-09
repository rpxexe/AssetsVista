'use client'

import { useUser } from '@clerk/nextjs'

import { KeyRound, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";




export default function Login() {
  const { isSignedIn, user, isLoaded } = useUser()
  const router = useRouter();
 

  useEffect(() => {
    if (user) {
      router.replace("/admin");
    }
  }, [user, router]);
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
            
            <SignInButton/>
          </div>
          
        
        
          <div className="flex gap-2 justify-center items-center p-6 rounded-full text-[1rem] font-poppins  border border-2 dark:border-white border-zinc-300 shadow-md hover:bg-zinc-300 dark:bg-black">
            <UserPlus />
            <SignUpButton/>
            
          </div>
          
        </SignedOut>
      </div>
    );
}
