const nameRegex = RegExp("^[a-zA-Z]+$");

let user: string;
let isUserRetrieved: boolean = false;

export function getUser(): string {
    if (isUserRetrieved) return user;
    else {
        retrieveUser();
        isUserRetrieved = true;

        return user;
    }
}

export function retrieveUser() {
    const storedUser = localStorage.getItem("user-id");

    if (storedUser === null || storedUser === "null") {
        const name = getItemPrompt("your name").toLowerCase();
        const lastName = getItemPrompt("your last name").toLowerCase();
        user = `${name}-${lastName}`;
        localStorage.setItem("user-id", user);
    } else {
        user = storedUser;
        console.log("welcome back, " + user);
    }
}

function getItemPrompt(item: string): string {
    let attempt: string | null;

    attempt = prompt(`please enter ${item} (just letters):`, "");

    while (attempt === null || attempt === "" || nameRegex.test(attempt) === false || attempt.length < 2) {
        attempt = prompt(`try again. please just enter letters for ${item}:`, "");
    }

    return attempt;
}
