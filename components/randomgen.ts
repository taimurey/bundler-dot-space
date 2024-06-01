import { randomInt } from 'crypto';

export function distributeRandomly(total: number, iterations: number, minValue: number, maxValue: number): number[] {
    console.log(`Total: ${total}, Iterations: ${iterations}`);
    if (total < iterations) {
        throw new Error("Total must be greater than or equal to the number of iterations");
    }

    let amounts = Array(iterations).fill(0);
    let remaining = total;

    // Create a list of indices and shuffle it
    let indices = Array.from({ length: iterations }, (_, i) => i);
    indices.sort(() => Math.random() - 0.5);

    for (let index of indices) {
        // Determine the maximum amount that can be added to the current iteration
        let minPerIteration = Math.floor(total / iterations);
        let maxPerIteration = total - (iterations - 1) * minPerIteration;
        let maxAddition = Math.min(remaining, maxPerIteration);

        // Generate a random amount to add within the allowed range
        let amountToAdd;
        if (index === indices[indices.length - 1]) {
            amountToAdd = remaining;
        } else {
            amountToAdd = Math.min(randomInt(minValue, maxValue + 1), maxAddition);
        }

        // Update the amounts and remaining total
        amounts[index] += amountToAdd;
        remaining -= amountToAdd;

        // If there's no remaining amount, break the loop
        if (remaining === 0) {
            break;
        }
    }

    return amounts;
}