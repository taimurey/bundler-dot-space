export function distributeRandomly(total: number, iterations: number, minValue: number, maxValue: number): number[] {
    console.log(`Total: ${total}, Iterations: ${iterations}`);

    // Validate inputs
    if (total < iterations * minValue) {
        throw new Error("Total must be greater than or equal to the minimum value multiplied by the number of iterations");
    }

    // Initialize amounts array with the minimum value
    const amounts: number[] = Array(iterations).fill(minValue);
    let remaining = total - iterations * minValue; // Remaining amount after assigning minValue

    // Distribute the remaining amount randomly
    for (let i = 0; i < iterations; i++) {
        // Calculate the maximum possible amount for this iteration
        const maxPossible = Math.min(maxValue - minValue, remaining);

        if (maxPossible <= 0) continue; // Skip if no remaining amount can be added

        // Generate a random amount within the allowed range
        const randomAmount = getRandomInt(0, maxPossible);

        // Add the random amount to the current iteration
        amounts[i] += randomAmount;
        remaining -= randomAmount;
    }

    // Add any remaining amount to the last iteration
    if (remaining > 0) {
        amounts[iterations - 1] += remaining;
    }

    return amounts;
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
