// API configuration
const API_KEY = ""; // Replace with your valid Google Gemini API key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;

// State variables
let userMessage = null;
let isResponseGenerating = false;
let stopSpeaking = false; // Flag to control stop button
let followUpTimeout = null; // Follow-up timeout ID

// DOM elements
const chatContainer = document.querySelector(".chat-list");
const typingForm = document.querySelector(".typing-form");
const stopButton = document.querySelector("#stop-voice-button");
// Add voice input functionality
const voiceInputButton = document.querySelector("#voice-input-button");
const userInputField = document.querySelector(".typing-input");

// Function to handle outgoing messages
const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim();
  if (!userMessage || isResponseGenerating) return;

  isResponseGenerating = true;
  stopSpeaking = false; // Reset stop flag

  // Add user's message to the chat
  const outgoingDiv = document.createElement("div");
  outgoingDiv.classList.add("message", "outgoing");
  outgoingDiv.innerHTML = `
    <div class="message-content">
      <img class="avatar" src="download.jpg" alt="User avatar">
      <p class="text">${userMessage}</p>
    </div>`;
  chatContainer.appendChild(outgoingDiv);
  typingForm.querySelector(".typing-input").value = "";

  // Create a placeholder for the bot's response
  const incomingDiv = document.createElement("div");
  incomingDiv.classList.add("message", "incoming", "loading");
  incomingDiv.innerHTML = `
    <div class="message-content">
      <img class="avatar" src="downloads.jpg" alt="Bot avatar">
      <p class="text"></p>
    </div>`;
  chatContainer.appendChild(incomingDiv);

  // Fetch and handle the API response
  fetchAPIResponse(incomingDiv);
};

// Function to fetch API response
const fetchAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userMessage }] }]
      })
    });

    const data = await response.json();
    const apiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (apiResponse) {
      displayTypingEffect(apiResponse, textElement);
      speakText(apiResponse);
    } else {
      textElement.innerText = "I'm sorry, I couldn't process that. Please try again.";
    }
  } catch (error) {
    console.error("API Error:", error);
    textElement.innerText = "Error: Could not connect to the API.";
  } finally {
    incomingMessageDiv.classList.remove("loading");
    isResponseGenerating = false;
    scheduleFollowUp();
  }
};

// Function to display typing effect
const displayTypingEffect = (text, textElement) => {
  let index = 0;
  textElement.innerText = "";

  typingInterval = setInterval(() => {
    if (stopSpeaking) { // Stop typing if stopSpeaking is triggered
      clearInterval(typingInterval);
      return;
    }

    if (index < text.length) {
      textElement.innerText += text.charAt(index);
      index++;
    } else {
      clearInterval(typingInterval);
    }
  }, 30);
};

// Function to speak text
const speakText = (text) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;

  speechSynthesis.speak(utterance);
  utterance.onstart = () => stopSpeaking = false;
  utterance.onend = () => stopSpeaking = false;
};
// Initialize Speech Recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.continuous = false;
recognition.interimResults = false;

voiceInputButton.addEventListener("click", () => {
  recognition.start(); // Start listening
  console.log("Voice input started...");
});
// Handle speech recognition results
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript.trim();
  console.log("Recognized text:", transcript);

  // Place the recognized text into the input field
  userInputField.value = transcript;

  // Optionally, trigger form submission automatically
  const typingFormEvent = new Event("submit");
  typingForm.dispatchEvent(typingFormEvent);
};
recognition.onerror = (event) => {
  console.error("Speech recognition error:", event.error);
  alert("Could not recognize speech. Please try again.");
};

recognition.onend = () => {
  console.log("Voice input ended.");
};
// Stop speech and response functionality
stopButton.addEventListener("click", () => {
  speechSynthesis.cancel(); // Stop the voice
  stopSpeaking = true; // Stop the typing
  if (typingInterval) clearInterval(typingInterval); // Stop typing effect
});

// Schedule follow-up to check user well-being
const scheduleFollowUp = () => {
  followUpTimeout = setTimeout(async () => {
    const followUpPrompt = `Generate a follow-up message for this previous user prompt to check on their progress or well-being: "${userMessage}"`;

    // Create the follow-up message container
    const followUpDiv = document.createElement("div");
    followUpDiv.classList.add("message", "incoming", "loading");
    followUpDiv.innerHTML = `
      <div class="message-content">
        <img class="avatar" src="download.jpg" alt="Bot avatar">
        <p class="text"></p>
      </div>`;
    chatContainer.appendChild(followUpDiv);

    const textElement = followUpDiv.querySelector(".text");

    try {
      // Send request to Gemini API to generate follow-up message
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: followUpPrompt }] }]
        })
      });

      const data = await response.json();
      const followUpText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                           "How are you doing? Let me know if you'd like to continue chatting.";

      // Display follow-up message and speak text simultaneously
      displayFollowUpMessageAndSpeak(followUpText, textElement, followUpDiv);

    } catch (error) {
      console.error("Follow-up API Error:", error);
      textElement.innerText = "Something went wrong while generating the follow-up message.";
    } finally {
      followUpDiv.classList.remove("loading");
    }
  }, 60000); // Follow-up after 1 minute
};

// Function to display text and speak simultaneously
const displayFollowUpMessageAndSpeak = (text, textElement, messageDiv) => {
  // Remove the "loading" state before typing starts
  messageDiv.classList.remove("loading");

  let index = 0;
  textElement.innerText = "";

  // Display text with a typing effect
  const typingInterval = setInterval(() => {
    if (index < text.length) {
      textElement.innerText += text.charAt(index);
      index++;
    } else {
      clearInterval(typingInterval);
    }
  }, 30);

  // Speak text simultaneously
  speakText(text);
};


// Event listener for form submission
typingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleOutgoingChat();
});
