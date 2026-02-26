"use client";
import Login from "@/components/login";
import { ModeToggle } from "@/components/ModeToggle";
import { Github, Cog, Globe } from "lucide-react";

export default function Home() {
  return (
    <>
      <div className="h-screen">
        <div className="w-[95%] flex justify-end p-5 ">
          <ModeToggle />
        </div>
        <div className="flex justify-center items-center flex-col md:gap-20 md:p-20 gap-10 p-[10px] ">
          <main className="flex flex-col items-center justify-center border rounded-xl py-10 md:py-16 border-zinc-300 shadow-md hover:shadow-lg w-full md:w-[50%]">
            <div className="w-full flex justify-center items-center md:flex-row flex-col md:gap-1">
              <Cog
                size={115}
                className="animate-spin-slow -mt-3"
                strokeWidth={2.7}
              />
              <h3 className=" font-extrabold md:text-[4.5rem] md:flex-row flex-col text-4xl font-poppins">
                AssetsVista
              </h3>
            </div>
            <div className="flex justify-center mb-[30px] mt-5 md:mt-2 md:px-32">
              <p className="text-center font-semibold font-poppins">
                {" "}
                It is an open source software. Transparency, security and
                oversight is at the heart of everything we do. No vendor lock-in
                again, ever. ❤
              </p>
            </div>
            
            <Login />
          </main>
          <footer className="row-start-3 flex gap-[0.5rem] md:gap-10 items-center justify-center">
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="#"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Cog />
              AssetsVista<span>&copy; 2024</span>
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="#"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github />
              Github →
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="#"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Globe />
              Privacy Policy
            </a>
          </footer>
        </div>
      </div>
    </>
  );
}
