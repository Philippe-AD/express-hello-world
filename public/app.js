const input = document.getElementById("messageInput");
const button = document.getElementById("sendBtn");
const output = document.getElementById("output");

button.addEventListener("click", async () => {
  const message = input.value.trim();

  try {
    const res = await fetch("/api/echo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    output.textContent = "Erreur : " + err.message;
  }
});
