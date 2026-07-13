# Wash & Go

Sistema de gestión para negocio de alquiler de lavadoras (lavado a domicilio / renta de electrodomésticos). Permite controlar pedidos, caja diaria, precios por zona y reportes, con distintos niveles de acceso por usuario.

**App en producción**: https://wash-go.vercel.app

## Funcionalidades

- **Panel de Control** — resumen general del negocio (pedidos activos, ingresos, alertas).
- **Alquileres** — registro y seguimiento de pedidos:
  - Creación de pedido normal (queda `activo` hasta completar la entrega/retiro).
  - **Solo Gas**: registro de recarga de gas sin alquiler completo.
  - **Pago Adelantado**: el cliente paga al momento de pedir (no al retirar). El ingreso se registra en Caja ese mismo día; al completar el pedido solo se marca quién retiró y la hora, sin volver a cobrar.
  - Identificación de la lavadora asignada: número (1 al 35) y marca (Mabe / Haceb).
  - Métodos de pago: efectivo, transferencia, dividido (efectivo + transferencia), o pago pendiente (deuda a cobrar después).
- **Caja Diaria** — control de ingresos y egresos, reconciliación de efectivo/transferencia.
- **Servicios y Zonas** — configuración de zonas de cobertura, precios por tipo de servicio y recargos (horas extra, piso).
- **Reportes** — reportes financieros y operativos por período.
- **Usuarios** — gestión de usuarios y roles con acceso a la aplicación.

## Stack técnico

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [shadcn-ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (base de datos Postgres, autenticación, RLS)
- Despliegue continuo en [Vercel](https://vercel.com/)

## Desarrollo local

Requisito: Node.js y npm ([instalar con nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
# 1. Clonar el repositorio
git clone https://github.com/pelayo93/wash-go.git

# 2. Entrar al proyecto
cd wash-go

# 3. Instalar dependencias
npm i

# 4. Levantar el servidor de desarrollo
npm run dev
```

## Base de datos (Supabase)

Las migraciones SQL están en `supabase/migrations/`. Al agregar una nueva, correrla manualmente en el **SQL Editor** del proyecto de Supabase (Dashboard → SQL Editor → pegar → Run) para que quede aplicada en la base real.

## Edición del código

- **Directo en GitHub**: entra al archivo, ícono de lápiz (editar), commit.
- **Localmente**: clona el repo, edita con tu IDE, y haz push — los cambios se reflejan en el despliegue de Vercel automáticamente.
- **Lovable**: el proyecto sigue sincronizado con [Lovable](https://lovable.dev/), útil para cambios visuales/UI rápidos. Para lógica de negocio (pagos, caja, reportes) se recomienda editar el código directamente para no romper reglas ya afinadas.
