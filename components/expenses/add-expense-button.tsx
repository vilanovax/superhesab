"use client";

import { useEffect, useState } from "react";
import { ExpenseForm, type ExpenseMember } from "@/components/ExpenseForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type AddExpenseButtonProps = {
  spaceId: string;
  currentUserId: string;
  members: ExpenseMember[];
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function AddExpenseButton({
  spaceId,
  currentUserId,
  members,
}: AddExpenseButtonProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const form = (
    <ExpenseForm
      spaceId={spaceId}
      currentUserId={currentUserId}
      members={members}
      onSuccess={() => setOpen(false)}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 end-6 z-40 h-14 min-h-14 rounded-full px-6 shadow-none md:bottom-8 md:end-8">
            + ثبت هزینه
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ثبت هزینه جدید</DialogTitle>
            <DialogDescription>
              مبلغ، پرداخت‌کننده و نحوه تسهیم را مشخص کنید.
            </DialogDescription>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="fixed bottom-6 end-6 z-40 h-14 min-h-14 rounded-full px-6 shadow-none">
          + ثبت هزینه
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>ثبت هزینه جدید</DrawerTitle>
          <DrawerDescription>
            مبلغ، پرداخت‌کننده و نحوه تسهیم را مشخص کنید.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">{form}</div>
      </DrawerContent>
    </Drawer>
  );
}
