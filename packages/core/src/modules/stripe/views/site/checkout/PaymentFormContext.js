import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm";

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
// loadStripe is initialized with your real test publishable API key.
const promise = loadStripe("pk_test_51Jdo9iEvEMCuLU1xfxYWbka7AdHF7ADu2H6h1vuvnLZuC5c5L5CUsvyCRHhSgGOF8bhxqrbKIwck6CA0J1jL6HxH005zCFd8sI");

export default function App() {
    return (
        <div className="App">
            <Elements stripe={promise}>
                <CheckoutForm />
            </Elements>
        </div>
    );
}
