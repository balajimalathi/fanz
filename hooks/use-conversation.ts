"use client";

import { useState, useEffect, useCallback } from "react";

export interface Conversation {
  id: string;
  serviceOrderId: string;
  creatorId: string;
  fanId: string;
  lastMessageAt: string | null;
  unreadCountCreator: number;
  unreadCountFan: number;
  createdAt: string;
}

export function useConversation(serviceOrderId: string | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async () => {
    if (!serviceOrderId) {
      setConversation(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/conversations?serviceOrderId=${serviceOrderId}`);
      if (!res.ok) {
        if (res.status === 404) {
          // Conversation doesn't exist yet, create it
          const createRes = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceOrderId }),
          });

          if (!createRes.ok) {
            throw new Error("Failed to create conversation");
          }

          const newConversation = await createRes.json();
          setConversation(newConversation);
        } else {
          throw new Error("Failed to fetch conversation");
        }
      } else {
        const data = await res.json();
        setConversation(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load conversation";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [serviceOrderId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  return {
    conversation,
    isLoading,
    error,
    refetch: fetchConversation,
  };
}

