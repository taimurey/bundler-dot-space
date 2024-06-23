export function distributeRandomly(total: number, iterations: number, minValue: number, maxValue: number): number[] {
    console.log(`Total: ${total}, Iterations: ${iterations}`);
    if (total < iterations) {
        throw new Error("Total must be greater than or equal to the number of iterations");
    }

    const amounts = Array(iterations).fill(0);
    let remaining = total;

    // Create a list of indices and shuffle it
    const indices = Array.from({ length: iterations }, (_, i) => i);
    indices.sort(() => Math.random() - 0.5);

    for (const index of indices) {

        // Generate a random amount to add within the allowed range
        let amountToAdd;
        if (index === indices[indices.length - 1]) {
            amountToAdd = remaining;
        } else {
            amountToAdd = getRandomInt(minValue, maxValue);
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

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}