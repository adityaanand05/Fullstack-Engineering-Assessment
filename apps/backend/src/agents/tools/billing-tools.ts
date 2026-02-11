export interface ModificationResult {
  success: boolean;
  orderNumber: string;
  message: string;
  updatedFields?: string[];
}
