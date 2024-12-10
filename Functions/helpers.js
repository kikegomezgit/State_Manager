const getIdwithConsecutive = (id) => {
    // Check if the ID ends with an underscore followed by digits
    if (/_\d+$/.test(id)) {
        // Extract the current suffix number using a regex
        const match = id.match(/_(\d+)$/); // Match the last `_xx` pattern
        if (match && match[1]) {
            const currentNumber = parseInt(match[1], 10); // Convert the suffix to a number
            const newNumber = currentNumber + 1; // Increment the number
            id = id.replace(/_\d+$/, `_${newNumber}`); // Replace the last suffix with the incremented one
        }
    } else {
        // If it doesn't match the pattern, append '_01' as the starting suffix
        id = `${id}_01`;
    }
    return id;
};


module.exports = { getIdwithConsecutive };