import { ModelConfig } from "@/features/settings/store/config";
import { type Mask } from "@/features/prompts/store/mask";

export type BuiltinMask = Omit<Mask, "id" | "modelConfig"> & {
  builtin: Boolean;
  modelConfig: Partial<ModelConfig>;
};
