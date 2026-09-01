export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship?: string; // "Family" | "Friend" | "Work" | "Other"
  avatarColor?: string;
}

export type CallState =
  | "CALL_STARTED"
  | "CALL_DIALER_OPENED"
  | "WHATSAPP_OPENED"
  | "CONTACT_NOT_FOUND"
  | "MULTIPLE_CONTACTS_FOUND"
  | "PERMISSION_REQUIRED"
  | "ACTION_FAILED";

export interface CallCommandResult {
  state: CallState;
  callType: "phone" | "whatsapp" | "whatsapp_video" | "dialer";
  contactName?: string;
  phoneNumber?: string;
  matchingContacts?: Contact[];
  message: string;
}

const STORAGE_KEY = "ZOYA_SAVED_CONTACTS";

// Default pre-populated contacts
const DEFAULT_CONTACTS: Contact[] = [
  {
    id: "c-1",
    name: "Mummy",
    phoneNumber: "9876543210",
    relationship: "Family",
    avatarColor: "bg-pink-500",
  },
  {
    id: "c-2",
    name: "Papa",
    phoneNumber: "9876543211",
    relationship: "Family",
    avatarColor: "bg-blue-500",
  },
  {
    id: "c-3",
    name: "Rahul Sharma",
    phoneNumber: "9876543212",
    relationship: "Friend",
    avatarColor: "bg-purple-500",
  },
  {
    id: "c-4",
    name: "Rahul Verma",
    phoneNumber: "9876543213",
    relationship: "Friend",
    avatarColor: "bg-indigo-500",
  },
  {
    id: "c-5",
    name: "Ashish Sardar",
    phoneNumber: "9876543214",
    relationship: "Friend",
    avatarColor: "bg-emerald-500",
  },
  {
    id: "c-6",
    name: "Ajay Sardar",
    phoneNumber: "9876543215",
    relationship: "Friend",
    avatarColor: "bg-amber-500",
  },
  {
    id: "c-7",
    name: "Boss Udit",
    phoneNumber: "9876543216",
    relationship: "Self",
    avatarColor: "bg-cyan-500",
  },
];

export function getContacts(): Contact[] {
  if (typeof window === "undefined") return DEFAULT_CONTACTS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Initialize default contacts
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONTACTS));
    return DEFAULT_CONTACTS;
  } catch (e) {
    console.error("Error reading contacts from storage:", e);
    return DEFAULT_CONTACTS;
  }
}

export function saveContact(contact: Omit<Contact, "id"> & { id?: string }): Contact {
  const contacts = getContacts();
  let updatedContact: Contact;

  if (contact.id) {
    updatedContact = { ...contact, id: contact.id };
    const idx = contacts.findIndex((c) => c.id === contact.id);
    if (idx !== -1) {
      contacts[idx] = updatedContact;
    } else {
      contacts.push(updatedContact);
    }
  } else {
    updatedContact = {
      ...contact,
      id: "c-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      avatarColor: contact.avatarColor || "bg-violet-500",
    };
    contacts.push(updatedContact);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch (e) {
    console.error("Failed to save contacts:", e);
  }

  return updatedContact;
}

export function deleteContact(id: string): void {
  const contacts = getContacts().filter((c) => c.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch (e) {
    console.error("Failed to delete contact:", e);
  }
}

export function findContactByName(name: string): Contact[] {
  const cleanQuery = name.trim().toLowerCase();
  if (!cleanQuery) return [];

  const contacts = getContacts();

  // 1. Exact name or nickname match
  const exactMatches = contacts.filter((c) => c.name.toLowerCase() === cleanQuery);
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // 2. Starts with name or contains word match (e.g. "Rahul" matching "Rahul Sharma" & "Rahul Verma")
  const wordMatches = contacts.filter((c) => {
    const cName = c.name.toLowerCase();
    const parts = cName.split(/\s+/);
    return parts.some((p) => p === cleanQuery || p.startsWith(cleanQuery)) || cName.includes(cleanQuery);
  });

  return wordMatches;
}

export function findContactPhoneNumber(contact: Contact): string {
  return contact.phoneNumber.replace(/[^\d+]/g, "");
}

// Format phone number to clean digits for dialing
export function formatPhoneNumberForDialing(inputNumber: string): string {
  const cleaned = inputNumber.replace(/[^\d+]/g, "");
  // Default to +91 country code if 10 digits
  if (cleaned.length === 10 && !cleaned.startsWith("+")) {
    return "+91" + cleaned;
  }
  return cleaned;
}

// Check if Android Native Bridge is available in WebView
function getAndroidBridge(): any {
  if (typeof window !== "undefined") {
    return (window as any).AndroidBridge || (window as any).AndroidInterface || null;
  }
  return null;
}

// Normal Phone Call
export function makePhoneCall(phoneNumber: string): { state: CallState; message: string } {
  const cleanNumber = formatPhoneNumberForDialing(phoneNumber);
  const bridge = getAndroidBridge();

  if (bridge && typeof bridge.makePhoneCall === "function") {
    try {
      const res = bridge.makePhoneCall(cleanNumber);
      if (res === "PERMISSION_REQUIRED") {
        return {
          state: "PERMISSION_REQUIRED",
          message: "Boss, CALL_PHONE permission required. Phone dialer khol rahi hoon.",
        };
      }
      return {
        state: "CALL_STARTED",
        message: "Ji boss, call laga rahi hoon.",
      };
    } catch (e) {
      console.warn("Android native call error, falling back to dialer:", e);
    }
  }

  // Fallback: Open dialer or launch tel link
  try {
    const telUrl = `tel:${cleanNumber}`;
    window.location.href = telUrl;
    return {
      state: "CALL_STARTED",
      message: "Ji boss, call laga rahi hoon.",
    };
  } catch (err) {
    return openDialer(phoneNumber);
  }
}

// Dialer Fallback
export function openDialer(phoneNumber: string): { state: CallState; message: string } {
  const cleanNumber = formatPhoneNumberForDialing(phoneNumber);
  const bridge = getAndroidBridge();

  if (bridge && typeof bridge.openDialer === "function") {
    try {
      bridge.openDialer(cleanNumber);
      return {
        state: "CALL_DIALER_OPENED",
        message: "Ji boss, number dialer mein khol diya hai.",
      };
    } catch (e) {
      console.warn("Android dialer bridge error:", e);
    }
  }

  try {
    window.location.href = `tel:${cleanNumber}`;
    return {
      state: "CALL_DIALER_OPENED",
      message: "Ji boss, number dialer mein khol diya hai.",
    };
  } catch (e) {
    return {
      state: "ACTION_FAILED",
      message: "Boss, dialer kholne mein samasya aayi.",
    };
  }
}

// WhatsApp Voice Call
export function startWhatsAppCall(phoneNumber: string): { state: CallState; message: string } {
  const rawNumber = phoneNumber.replace(/[^\d]/g, "");
  // Ensure country code
  const fullNumber = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
  const bridge = getAndroidBridge();

  if (bridge && typeof bridge.startWhatsAppCall === "function") {
    try {
      const success = bridge.startWhatsAppCall(fullNumber);
      if (success === false) {
        return {
          state: "ACTION_FAILED",
          message: "Boss, WhatsApp is device par available nahi hai.",
        };
      }
      return {
        state: "WHATSAPP_OPENED",
        message: "Ji boss, WhatsApp call ke liye khol diya hai.",
      };
    } catch (e) {
      console.warn("Android WhatsApp call bridge error:", e);
    }
  }

  // Deep Link Intent Fallback
  try {
    // Attempt WhatsApp deep link or web API fallback
    const waUrl = `https://api.whatsapp.com/send?phone=${fullNumber}`;
    window.open(waUrl, "_blank");
    return {
      state: "WHATSAPP_OPENED",
      message: "Ji boss, WhatsApp call ke liye khol diya hai.",
    };
  } catch (e) {
    return {
      state: "ACTION_FAILED",
      message: "Boss, WhatsApp is device par available nahi hai.",
    };
  }
}

// WhatsApp Video Call
export function startWhatsAppVideoCall(phoneNumber: string): { state: CallState; message: string } {
  const rawNumber = phoneNumber.replace(/[^\d]/g, "");
  const fullNumber = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
  const bridge = getAndroidBridge();

  if (bridge && typeof bridge.startWhatsAppVideoCall === "function") {
    try {
      const success = bridge.startWhatsAppVideoCall(fullNumber);
      if (success === false) {
        return {
          state: "ACTION_FAILED",
          message: "Boss, WhatsApp is device par available nahi hai.",
        };
      }
      return {
        state: "WHATSAPP_OPENED",
        message: "Ji boss, WhatsApp video call ke liye khol diya hai.",
      };
    } catch (e) {
      console.warn("Android WhatsApp video call bridge error:", e);
    }
  }

  // Deep Link Intent Fallback
  try {
    const waUrl = `https://api.whatsapp.com/send?phone=${fullNumber}`;
    window.open(waUrl, "_blank");
    return {
      state: "WHATSAPP_OPENED",
      message: "Ji boss, WhatsApp video call ke liye khol diya hai.",
    };
  } catch (e) {
    return {
      state: "ACTION_FAILED",
      message: "Boss, WhatsApp is device par available nahi hai.",
    };
  }
}

// Comprehensive Command Parser for Calling
export function processVoiceCallCommand(command: string): CallCommandResult | null {
  const lowerCmd = command.toLowerCase().trim();

  // Check if command is a call intent
  const isCallIntent =
    lowerCmd.includes("call") ||
    lowerCmd.includes("dial") ||
    lowerCmd.includes("phone karo") ||
    lowerCmd.includes("fon karo") ||
    lowerCmd.includes("baat karao") ||
    lowerCmd.includes("laga do");

  if (!isCallIntent) {
    return null;
  }

  // Distinguish WhatsApp Voice vs WhatsApp Video vs Normal Call
  const isWhatsAppVideo =
    lowerCmd.includes("whatsapp video") ||
    lowerCmd.includes("whatsapp vidio") ||
    lowerCmd.includes("video call");

  const isWhatsAppVoice =
    !isWhatsAppVideo &&
    (lowerCmd.includes("whatsapp call") ||
     lowerCmd.includes("whatsapp pe call") ||
     lowerCmd.includes("whatsapp par call") ||
     lowerCmd.includes("whatsapp se call") ||
     lowerCmd.includes("whatsapp"));

  // 1. Direct Phone Number Call Detection (e.g. "9876543210 par call karo")
  const phoneNumMatch = lowerCmd.match(/(\+?\d[\d\s\-]{8,14}\d)/);
  if (phoneNumMatch) {
    const rawNum = phoneNumMatch[1].replace(/[\s\-]/g, "");
    if (rawNum.length >= 8) {
      if (isWhatsAppVideo) {
        const res = startWhatsAppVideoCall(rawNum);
        return {
          state: res.state,
          callType: "whatsapp_video",
          phoneNumber: rawNum,
          message: res.message,
        };
      } else if (isWhatsAppVoice) {
        const res = startWhatsAppCall(rawNum);
        return {
          state: res.state,
          callType: "whatsapp",
          phoneNumber: rawNum,
          message: res.message,
        };
      } else {
        const res = makePhoneCall(rawNum);
        return {
          state: res.state,
          callType: "phone",
          phoneNumber: rawNum,
          message: res.message,
        };
      }
    }
  }

  // 2. Contact Name Extraction
  // Examples:
  // "mummy ko call karo"
  // "papa ko whatsapp video call karo"
  // "Rahul ko call karo"
  // "Udit ke contact ko call karo"
  // "is contact ko call karo"
  let extractedName = lowerCmd
    .replace(/^(hey\s+)?zoya(\s+ai)?\s*/i, "")
    .replace(/^(please\s+)?/i, "")
    .replace(/(whatsapp\s+video\s+call|whatsapp\s+call|video\s+call|call|dial|phone|fon)\s+/gi, " ")
    .replace(/\s+(whatsapp\s+video\s+call|whatsapp\s+call|video\s+call|call\s+karo|ko\s+call\s+karo|par\s+call\s+karo|karo|laga\s+do|dial\s+karo)$/gi, " ")
    .replace(/\b(ko|par|se|pe|ke\s+contact|is\s+contact)\b/gi, "")
    .trim();

  if (!extractedName || extractedName === "is" || extractedName === "contact") {
    // If name wasn't cleanly extracted, try regex matches
    const nameMatch =
      lowerCmd.match(/(?:call|dial)\s+([a-z0-9\s]+?)(?:\s+ko|\s+par|\s+karo|\s+pe|$)/i) ||
      lowerCmd.match(/([a-z0-9\s]+?)\s+ko\s+(?:call|whatsapp)/i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    }
  }

  if (!extractedName) {
    return {
      state: "CONTACT_NOT_FOUND",
      callType: "phone",
      message: "Boss, ye contact mujhe nahi mila.",
    };
  }

  // Look up contact in database
  const matches = findContactByName(extractedName);

  if (matches.length === 0) {
    return {
      state: "CONTACT_NOT_FOUND",
      callType: isWhatsAppVideo ? "whatsapp_video" : isWhatsAppVoice ? "whatsapp" : "phone",
      contactName: extractedName,
      message: "Boss, ye contact mujhe nahi mila.",
    };
  }

  // Multiple contacts found (Ambiguous check)
  if (matches.length > 1) {
    const formattedName = matches[0].name.split(" ")[0] || extractedName;
    return {
      state: "MULTIPLE_CONTACTS_FOUND",
      callType: isWhatsAppVideo ? "whatsapp_video" : isWhatsAppVoice ? "whatsapp" : "phone",
      contactName: extractedName,
      matchingContacts: matches,
      message: `Boss, mujhe ${formattedName} naam ke ${matches.length} contacts mile hain. Kaunse ${formattedName} ko call karun?`,
    };
  }

  // Single exact contact found
  const selectedContact = matches[0];
  const num = selectedContact.phoneNumber;

  if (isWhatsAppVideo) {
    const res = startWhatsAppVideoCall(num);
    return {
      state: res.state,
      callType: "whatsapp_video",
      contactName: selectedContact.name,
      phoneNumber: num,
      message: res.message,
    };
  } else if (isWhatsAppVoice) {
    const res = startWhatsAppCall(num);
    return {
      state: res.state,
      callType: "whatsapp",
      contactName: selectedContact.name,
      phoneNumber: num,
      message: res.message,
    };
  } else {
    const res = makePhoneCall(num);
    return {
      state: res.state,
      callType: "phone",
      contactName: selectedContact.name,
      phoneNumber: num,
      message: res.message,
    };
  }
}
