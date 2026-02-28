import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sprout, Send, ArrowLeft } from "lucide-react";

type Conversation = {
  user_id: string;
  full_name: string;
  last_message: string;
  last_at: string;
  unread: number;
};

const Messages = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(searchParams.get("to"));
  const [activeName, setActiveName] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      // Get all messages involving the user
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!data) return;

      // Group by other user
      const convMap = new Map<string, { messages: any[] }>();
      data.forEach((msg: any) => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(otherId)) convMap.set(otherId, { messages: [] });
        convMap.get(otherId)!.messages.push(msg);
      });

      // Fetch profiles
      const otherIds = [...convMap.keys()];
      if (searchParams.get("to") && !otherIds.includes(searchParams.get("to")!)) {
        otherIds.push(searchParams.get("to")!);
      }

      if (otherIds.length === 0) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", otherIds);

      const profileMap = new Map<string, string>();
      profiles?.forEach((p: any) => profileMap.set(p.user_id, p.full_name || "User"));

      const convs: Conversation[] = [];
      convMap.forEach((val, otherId) => {
        const last = val.messages[0];
        convs.push({
          user_id: otherId,
          full_name: profileMap.get(otherId) || "User",
          last_message: last.content,
          last_at: last.created_at,
          unread: val.messages.filter((m: any) => m.receiver_id === user.id && !m.read).length,
        });
      });

      // Add "to" user if not in conversations
      const toId = searchParams.get("to");
      if (toId && !convMap.has(toId)) {
        convs.unshift({
          user_id: toId,
          full_name: profileMap.get(toId) || "User",
          last_message: "",
          last_at: new Date().toISOString(),
          unread: 0,
        });
      }

      setConversations(convs);

      if (activeChat) {
        setActiveName(profileMap.get(activeChat) || "User");
      }
    };
    fetchConversations();
  }, [user]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!user || !activeChat) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${activeChat}),and(sender_id.eq.${activeChat},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });
      setMessages(data || []);

      // Mark as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", activeChat)
        .eq("receiver_id", user.id)
        .eq("read", false);
    };
    fetchMessages();

    // Update name
    const conv = conversations.find((c) => c.user_id === activeChat);
    if (conv) setActiveName(conv.full_name);

    // Realtime
    const channel = supabase
      .channel(`chat-${activeChat}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload: any) => {
        const msg = payload.new;
        if (
          (msg.sender_id === user.id && msg.receiver_id === activeChat) ||
          (msg.sender_id === activeChat && msg.receiver_id === user.id)
        ) {
          setMessages((prev) => [...prev, msg]);
          if (msg.sender_id === activeChat) {
            supabase.from("messages").update({ read: true }).eq("id", msg.id);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !user || !activeChat) return;
    setSending(true);
    const listingId = searchParams.get("listing");
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeChat,
      content: newMsg.trim(),
      listing_id: listingId || null,
    });
    setNewMsg("");
    setSending(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary" />
            <span className="font-serif text-xl">Agri Grid</span>
          </Link>
          <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
        </div>
      </header>

      <div className="flex-1 flex container mx-auto max-w-6xl">
        {/* Sidebar */}
        <div className="w-80 border-r border-border bg-card overflow-y-auto hidden md:block">
          <div className="p-4 border-b border-border">
            <h2 className="font-serif text-lg">Conversations</h2>
          </div>
          {conversations.length === 0 ? (
            <div className="p-4 text-muted-foreground text-sm">No conversations yet</div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.user_id}
                onClick={() => setActiveChat(conv.user_id)}
                className={`w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors ${
                  activeChat === conv.user_id ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm">{conv.full_name}</span>
                  {conv.unread > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">{conv.unread}</span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs mt-1 line-clamp-1">{conv.last_message}</p>
              </button>
            ))
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {activeChat ? (
            <>
              <div className="p-4 border-b border-border bg-card">
                <h3 className="font-semibold">{activeName}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-xl text-sm ${
                        msg.sender_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-4 border-t border-border bg-card flex gap-2">
                <Input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage} disabled={sending || !newMsg.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation or contact a seller from the marketplace
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
