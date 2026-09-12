import "server-only";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = new Stripe(key || "sk_test_placeholder", {
  apiVersion: "2026-08-26.dahlia",
});

export const isStripeConfigured = Boolean(key && !key.includes("placeholder"));
