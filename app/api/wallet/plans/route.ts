import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function GET(request: NextRequest) {
  try {
    const plans = [
      {
        id: "starter",
        name: "Starter",
        coins: env.FAN_WALLET_STARTER_COINS,
        price: env.FAN_WALLET_STARTER_PRICE,
        bonus: env.FAN_WALLET_STARTER_BONUS,
        totalCoins: env.FAN_WALLET_STARTER_COINS + env.FAN_WALLET_STARTER_BONUS,
        discount: env.FAN_WALLET_STARTER_DISCOUNT,
      },
      {
        id: "favorite",
        name: "Fan Favorite",
        coins: env.FAN_WALLET_FAVORITE_COINS,
        price: env.FAN_WALLET_FAVORITE_PRICE,
        bonus: env.FAN_WALLET_FAVORITE_BONUS,
        totalCoins: env.FAN_WALLET_FAVORITE_COINS + env.FAN_WALLET_FAVORITE_BONUS,
        popular: env.FAN_WALLET_FAVORITE_POPULAR,
      },
      {
        id: "vip",
        name: "VIP Whale",
        coins: env.FAN_WALLET_VIP_COINS,
        price: env.FAN_WALLET_VIP_PRICE,
        bonus: env.FAN_WALLET_VIP_BONUS,
        totalCoins: env.FAN_WALLET_VIP_COINS + env.FAN_WALLET_VIP_BONUS,
      },
    ];

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error fetching credit plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
