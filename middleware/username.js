const existingUsernames = new Set(); // Simulating a database check

function getRandomLetter() {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    return letters[Math.floor(Math.random() * letters.length)];
}

function getRandomDigits(phoneNumber, count = 3) {
    if (!phoneNumber) return "000"; // Default fallback if phoneNumber is missing
    phoneNumber = String(phoneNumber); // Ensure it's a string
    let shuffled = phoneNumber.split('').sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).join('');
}

function generateUniqueUsername(firstName, phoneNumber) {
    if (!firstName) throw new Error("First name is required");

    let randomLetter1 = getRandomLetter(); 
    let randomLetter2 = getRandomLetter(); 
    let randomDigits = getRandomDigits(phoneNumber, 3);
    let baseUsername = `${firstName[0].toLowerCase()}${randomLetter1}${randomLetter2}${randomDigits}`;
    let uniqueUsername = baseUsername;
    let counter = 1;
    let maxRetries = 100; // Prevent infinite loops

    while (existingUsernames.has(uniqueUsername) && counter < maxRetries) {
        uniqueUsername = `${baseUsername}${counter}`;
        counter++;
    }

    existingUsernames.add(uniqueUsername);
    
    return { username: uniqueUsername };
}

module.exports = { generateUniqueUsername };
