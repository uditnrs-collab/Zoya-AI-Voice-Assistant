import React, { useState, useEffect } from "react";
import {
  Phone,
  Video,
  UserPlus,
  Trash2,
  Edit2,
  X,
  Search,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  PhoneCall,
  Smartphone,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  Contact,
  getContacts,
  saveContact,
  deleteContact,
  makePhoneCall,
  startWhatsAppCall,
  startWhatsAppVideoCall,
  openDialer,
  CallCommandResult,
} from "../services/callService";

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCallAction?: CallCommandResult | null;
  onSelectContactToCall?: (contact: Contact) => void;
}

export default function ContactsModal({
  isOpen,
  onClose,
  activeCallAction,
  onSelectContactToCall,
}: ContactsModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRelation, setFormRelation] = useState("Friend");

  const [callToast, setCallToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshContacts();
    }
  }, [isOpen]);

  const refreshContacts = () => {
    setContacts(getContacts());
  };

  if (!isOpen) return null;

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchQuery) ||
      (c.relationship && c.relationship.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    saveContact({
      id: editingId || undefined,
      name: formName.trim(),
      phoneNumber: formPhone.trim(),
      relationship: formRelation,
    });

    setFormName("");
    setFormPhone("");
    setFormRelation("Friend");
    setIsAdding(false);
    setEditingId(null);
    refreshContacts();
  };

  const handleEdit = (contact: Contact) => {
    setFormName(contact.name);
    setFormPhone(contact.phoneNumber);
    setFormRelation(contact.relationship || "Friend");
    setEditingId(contact.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Kya aap is contact ko delete karna chahte hain?")) {
      deleteContact(id);
      refreshContacts();
    }
  };

  const triggerCall = (contact: Contact, type: "phone" | "whatsapp" | "whatsapp_video" | "dialer") => {
    let result: { state: string; message: string };
    if (type === "whatsapp") {
      result = startWhatsAppCall(contact.phoneNumber);
    } else if (type === "whatsapp_video") {
      result = startWhatsAppVideoCall(contact.phoneNumber);
    } else if (type === "dialer") {
      result = openDialer(contact.phoneNumber);
    } else {
      result = makePhoneCall(contact.phoneNumber);
    }

    setCallToast(result.message);
    setTimeout(() => setCallToast(null), 4000);
  };

  // Import contacts via Web Contacts API if supported
  const handleImportWebContacts = async () => {
    if ("contacts" in navigator && "select" in (navigator as any).contacts) {
      try {
        const props = ["name", "tel"];
        const selected = await (navigator as any).contacts.select(props, { multiple: true });
        if (selected && selected.length > 0) {
          selected.forEach((c: any) => {
            const name = c.name?.[0] || "Imported Contact";
            const tel = c.tel?.[0] || "";
            if (tel) {
              saveContact({ name, phoneNumber: tel, relationship: "Imported" });
            }
          });
          refreshContacts();
          setCallToast("Contacts imported successfully!");
          setTimeout(() => setCallToast(null), 3000);
        }
      } catch (e) {
        console.warn("Contacts API failed or dismissed:", e);
      }
    } else {
      alert("Device Web Contacts API is not supported in this browser mode. You can add contacts manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-950/80 via-zinc-900 to-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600/20 text-violet-400 rounded-xl border border-violet-500/30">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                ZOYA Contacts & Call Control
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-normal">
                  Android Ready
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Manage contacts & voice calling targets for Boss Udit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Call Toast Notification */}
        {callToast && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 px-4 py-2 text-xs flex items-center justify-between animate-slideDown">
            <span className="flex items-center gap-2 font-medium">
              <PhoneCall className="w-4 h-4 animate-pulse" /> {callToast}
            </span>
            <button onClick={() => setCallToast(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Ambiguous Call Resolution Banner if ZOYA found multiple matching contacts */}
        {activeCallAction && activeCallAction.state === "MULTIPLE_CONTACTS_FOUND" && (
          <div className="p-3 bg-amber-950/80 border-b border-amber-500/30 text-amber-200 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              {activeCallAction.message}
            </div>
            <div className="text-zinc-300 text-[11px]">Tap on the specific contact below to place the call:</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {activeCallAction.matchingContacts?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (onSelectContactToCall) {
                      onSelectContactToCall(c);
                    } else {
                      triggerCall(c, activeCallAction.callType || "phone");
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-100 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Phone className="w-3 h-3 text-amber-400" />
                  {c.name} ({c.phoneNumber})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Top Controls & Search */}
        <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contact name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800/80 border border-zinc-700/80 text-white pl-9 pr-3 py-1.5 text-xs rounded-xl focus:outline-none focus:border-violet-500 text-zinc-200 placeholder-zinc-500"
            />
          </div>

          {"contacts" in navigator && "select" in (navigator as any).contacts && (
            <button
              onClick={handleImportWebContacts}
              title="Import Device Contacts"
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 text-xs flex items-center gap-1 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingId(null);
              setFormName("");
              setFormPhone("");
              setFormRelation("Friend");
            }}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition shadow-lg shadow-violet-600/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isAdding ? "Cancel" : "Add Contact"}
          </button>
        </div>

        {/* Add/Edit Contact Form Drawer */}
        {isAdding && (
          <form onSubmit={handleSave} className="p-4 bg-zinc-950 border-b border-zinc-800 flex flex-col gap-3 animate-fadeIn">
            <div className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              {editingId ? "Edit Contact Details" : "Add New Calling Contact"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Full Name (e.g. Mummy, Rahul Sharma)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
              />
              <input
                type="tel"
                placeholder="Phone Number (e.g. 9876543210)"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                required
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <select
                value={formRelation}
                onChange={(e) => setFormRelation(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-violet-500"
              >
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="Work">Work</option>
                <option value="Self">Self</option>
                <option value="Other">Other</option>
              </select>

              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
              >
                {editingId ? "Update Contact" : "Save Contact"}
              </button>
            </div>
          </form>
        )}

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No contacts found matching "{searchQuery}".
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl transition group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${
                      contact.avatarColor || "bg-violet-600"
                    } text-white flex items-center justify-center font-bold text-sm shadow-md`}
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      {contact.name}
                      {contact.relationship && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 border border-zinc-600">
                          {contact.relationship}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">{contact.phoneNumber}</div>
                  </div>
                </div>

                {/* Calling Action Buttons */}
                <div className="flex items-center gap-1.5">
                  {/* Normal Phone Call */}
                  <button
                    onClick={() => triggerCall(contact, "phone")}
                    title="Normal Phone Call"
                    className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg border border-emerald-500/30 transition"
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                  {/* WhatsApp Voice Call */}
                  <button
                    onClick={() => triggerCall(contact, "whatsapp")}
                    title="WhatsApp Call"
                    className="p-2 bg-emerald-700/20 hover:bg-emerald-700 text-emerald-300 hover:text-white rounded-lg border border-emerald-600/30 transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {/* WhatsApp Video Call */}
                  <button
                    onClick={() => triggerCall(contact, "whatsapp_video")}
                    title="WhatsApp Video Call"
                    className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg border border-blue-500/30 transition"
                  >
                    <Video className="w-4 h-4" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(contact)}
                    title="Edit Contact"
                    className="p-2 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(contact.id)}
                    title="Delete Contact"
                    className="p-2 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Private & Stored On Device</span>
          </div>
          <div>Voice Command: "ZOYA, Rahul ko call karo"</div>
        </div>
      </div>
    </div>
  );
}
