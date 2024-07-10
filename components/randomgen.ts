export function distributeRandomly(total: number, iterations: number, minValue: number, maxValue: number): number[] {
    console.log(`Total: ${total}, Iterations: ${iterations}`);
    if (total < iterations) {
        throw new Error("Total must be greater than or equal to the number of iterations");
    }

    const amounts = Array(iterations).fill(0);
    let remaining = total;

    for (let i = 0; i < iterations; i++) {
        // Calculate the average of the remaining total over the remaining iterations
        const averageRemaining = remaining / (iterations - i);

        // Adjust max value based on the average to ensure more uniform distribution
        const adjustedMaxValue = Math.min(maxValue, averageRemaining * 2);

        // Ensure the min value is not greater than the adjusted max value
        const adjustedMinValue = Math.min(minValue, adjustedMaxValue);

        let amountToAdd;
        if (i === iterations - 1) {
            // Assign the remaining total to the last iteration
            amountToAdd = remaining;
        } else {
            // Generate a random amount within the adjusted range
            amountToAdd = getRandomInt(adjustedMinValue, adjustedMaxValue);
        }

        // Update the amounts and remaining total
        amounts[i] += amountToAdd;
        remaining -= amountToAdd;
    }

    return amounts;
}

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}