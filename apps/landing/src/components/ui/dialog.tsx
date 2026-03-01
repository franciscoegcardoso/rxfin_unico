"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(
  (props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>, ref: React.Ref<React.ElementRef<typeof DialogPrimitive.Overlay>>) => (
    <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm", props.className)} {...props} />
  )
);
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef(
  (
    props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideCloseButton?: boolean },
    ref: React.Ref<React.ElementRef<typeof DialogPrimitive.Content>>
  ) => {
    const { className, children, hideCloseButton, ...rest } = props;
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg rounded-lg",
            className
          )}
          {...rest}
        >
          {children}
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1 opacity-70 hover:opacity-100 hover:bg-muted">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }
);
DialogContent.displayName = "DialogContent";

export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent };
