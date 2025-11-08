"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendChatQuery, formatSQLQuery, type ChatQueryResponse } from "@/lib/chat-api";

interface Message {
    id: string;
    type: "user" | "assistant" | "error";
    content: string;
    timestamp: Date;
    sqlQuery?: string;
    data?: any;
}

interface LLMChatInterfaceProps {
    onDataReceived?: (data: ChatQueryResponse) => void;
}

export function LLMChatInterface({ onDataReceived }: LLMChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showSqlQuery, setShowSqlQuery] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: "user",
            content: inputValue,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await sendChatQuery(inputValue);

            if (response.success) {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: "assistant",
                    content: response.processed_data?.summary || "Query executed successfully. Check the visualizations below.",
                    timestamp: new Date(),
                    sqlQuery: response.sql_query,
                    data: response.processed_data,
                };

                setMessages((prev) => [...prev, assistantMessage]);

                // Store data globally for chart components
                if (typeof window !== 'undefined' && response.processed_data) {
                    (window as any).floatChatData = {
                        chart: response.processed_data.chart_data,
                        map: response.processed_data.map_data,
                        table: response.processed_data.table_data,
                        summary: response.processed_data.summary
                    };
                }

                // Notify parent component
                if (onDataReceived) {
                    onDataReceived(response);
                }
            } else {
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: "error",
                    content: response.error || "Failed to process query",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            }
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "error",
                content: error instanceof Error ? error.message : "An error occurred",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const suggestedQueries = [
        "Show me salinity profiles near the equator",
        "List all floats in the Arabian Sea",
        "Show temperature data for float 1900121",
        "Find floats near 15°N, 70°E",
    ];

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <h2 className="text-2xl font-bold mb-4">Ask about ocean data</h2>
                        <p className="text-muted-foreground mb-6">
                            Try asking questions in natural language
                        </p>
                        <div className="grid gap-2 max-w-2xl mx-auto">
                            {suggestedQueries.map((query, idx) => (
                                <Card
                                    key={idx}
                                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                                    onClick={() => setInputValue(query)}
                                >
                                    <p className="text-sm">{query}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.type === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.type === "user"
                                ? "bg-primary text-primary-foreground"
                                : message.type === "error"
                                    ? "bg-destructive/10 text-destructive border border-destructive"
                                    : "bg-card text-card-foreground border border-border"
                                }`}
                        >
                            {message.type === "error" && (
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-semibold">Error</span>
                                </div>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>

                            {/* Show SQL Query Button */}
                            {message.sqlQuery && (
                                <div className="mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() =>
                                            setShowSqlQuery(
                                                showSqlQuery === message.id ? null : message.id
                                            )
                                        }
                                    >
                                        {showSqlQuery === message.id ? "Hide Query" : "Show Query"}
                                    </Button>
                                    {showSqlQuery === message.id && (
                                        <div className="mt-2 p-2 rounded bg-muted text-xs font-mono whitespace-pre-wrap border border-border">
                                            {formatSQLQuery(message.sqlQuery)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-card text-card-foreground border border-border rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Processing your query...</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about ocean data..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
