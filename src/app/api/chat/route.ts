import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: google('gemini-1.5-pro') as any,
    messages,
    system: `Eres un asistente inteligente de ventas para un negocio. 
    Tu objetivo es ayudar a los clientes a realizar pedidos. 
    Debes ser amable, profesional y eficiente.
    
    Cuando un cliente quiera hacer un pedido, asegúrate de obtener:
    1. Su nombre completo.
    2. Su número de WhatsApp.
    3. Qué producto desea y cuántas unidades.
    
    Antes de guardar el pedido, resume los detalles y pide confirmación.
    Una vez confirmado, usa la herramienta 'saveOrder' para registrarlo en la base de datos.
    
    Si te preguntan por pedidos anteriores o el estado de sus pedidos, diles que pueden verlo en el dashboard principal.`,
    tools: {
      saveOrder: tool({
        description: 'Guarda un nuevo pedido en la base de datos SQLite.',
        parameters: z.object({
          customerName: z.string().describe('El nombre completo del cliente'),
          whatsapp: z.string().describe('El número de WhatsApp del cliente'),
          quantity: z.number().describe('La cantidad de unidades pedidas'),
          product: z.string().describe('El nombre o descripción del producto'),
          totalAmount: z.number().optional().describe('El monto total estimado si se conoce'),
        }),
        execute: async ({ customerName, whatsapp, quantity, product, totalAmount }: {
          customerName: string;
          whatsapp: string;
          quantity: number;
          product: string;
          totalAmount?: number;
        }) => {
          const order = await prisma.order.create({
            data: {
              customerName,
              whatsapp,
              quantity,
              product,
              totalAmount,
              status: 'PENDING',
            },
          });
          return { success: true, orderId: order.id };
        },
      }),
    },
  });

  return result.toTextStreamResponse();
}
