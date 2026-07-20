import { Redirect } from "expo-router";

export default function PromotionsScreen() {
  return <Redirect href={{ pathname: "/collection/[handle]", params: { handle: "special-prices", title: "Special Prices" } }} />;
}
