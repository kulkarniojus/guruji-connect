import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";

/**
 * Register payment routes
 */
export function registerPaymentRoutes(app: any) {
  // Create a new payment
  app.post("/api/payments", async (req: Request, res: Response) => {
    try {
      const { bookingId, amount, paymentId, status } = z.object({
        bookingId: z.number(),
        amount: z.number().positive(),
        paymentId: z.string(),
        status: z.enum(["unpaid", "partial", "paid", "refunded"]),
      }).parse(req.body);

      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Create payment
      const payment = await storage.createPayment({
        bookingId,
        amount,
        paymentId,
        status,
        paymentMethod: "card", // Default to card for now
        createdAt: new Date(),
      });
      
      // Update booking status if payment is successful
      if (status === "paid") {
        await storage.updateBookingStatus(bookingId, "confirmed");
      }
      
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Get payments by booking ID
  app.get("/api/payments/booking/:id", async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const payments = await storage.getPaymentsByBookingId(parseInt(id));
      
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Update payment status
  app.put("/api/payments/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const { status } = z.object({
        status: z.enum(["unpaid", "partial", "paid", "refunded"]),
      }).parse(req.body);

      const payment = await storage.updatePaymentStatus(parseInt(id), status);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // If payment is marked as paid, update the booking status
      if (status === "paid") {
        await storage.updateBookingStatus(payment.bookingId, "confirmed");
      }
      
      res.json(payment);
    } catch (error) {
      console.error("Error updating payment status:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to update payment status" });
    }
  });
}
