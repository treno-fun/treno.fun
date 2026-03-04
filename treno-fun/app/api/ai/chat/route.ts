// app/api/ai/chat/route.ts
// UPDATED: Uses getAuth()

import { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { openai, buildUserContext, AI_SYSTEM_PROMPT } from "@/lib/ai";
import { z } from "zod";

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.issues }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, conversationId } = parsed.data;

  let conversation = conversationId
    ? await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 20 },
      },
    })
    : null;

  if (!conversation) {
    conversation = await prisma.aiConversation.create({
      data: {
        userId: auth.userId,
        title: message.slice(0, 60),
      },
      include: { messages: true },
    });
  }

  if (conversation.userId !== auth.userId) {
    return new Response("Forbidden", { status: 403 });
  }

  let userContext: string;
  try {
    userContext = await buildUserContext(auth.userId);
  } catch (err) {
    console.error("Error building user context:", err);
    return new Response(JSON.stringify({ error: "Failed to load user data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: message,
    },
  });

  const history = conversation.messages.map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  let fullResponse = "";
  const encoder = new TextEncoder();
  const convId = conversation.id;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `${AI_SYSTEM_PROMPT}\n\n${userContext}` },
            ...history,
            { role: "user", content: message },
          ],
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            controller.enqueue(encoder.encode(content));
          }
        }

        await prisma.aiMessage.create({
          data: {
            conversationId: convId,
            role: "ASSISTANT",
            content: fullResponse,
          },
        });
      } catch (err) {
        console.error("OpenAI streaming error:", err);
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversation-Id": convId,
      "Cache-Control": "no-cache",
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const conversations = await prisma.aiConversation.findMany({
    where: { userId: auth.userId },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return Response.json(conversations);
}