import siteContentJson from "../../site-content.json";
import type { SiteContent } from "./types";

export const content = siteContentJson as unknown as SiteContent;
