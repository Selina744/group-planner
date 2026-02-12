/**
 * ItemForm component - modal form for creating/editing items
 * Supports both RECOMMENDED and SHARED item types
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Alert,
} from '@mui/material';
import type { Item, ItemType, ItemCategory, CreateItemForm, UpdateItemForm } from '../../types';
import { useCreateItemMutation, useUpdateItemMutation } from '../../queries/hooks';

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  item?: Item | undefined;
  defaultType?: ItemType | undefined;
}

const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'FOOD' as ItemCategory, label: 'Food' },
  { value: 'EQUIPMENT' as ItemCategory, label: 'Equipment' },
  { value: 'SUPPLIES' as ItemCategory, label: 'Supplies' },
  { value: 'CLOTHING' as ItemCategory, label: 'Clothing' },
  { value: 'ELECTRONICS' as ItemCategory, label: 'Electronics' },
  { value: 'TRANSPORTATION' as ItemCategory, label: 'Transportation' },
  { value: 'ENTERTAINMENT' as ItemCategory, label: 'Entertainment' },
  { value: 'SAFETY' as ItemCategory, label: 'Safety' },
  { value: 'OTHER' as ItemCategory, label: 'Other' },
];

export function ItemForm({ open, onClose, tripId, item, defaultType = 'RECOMMENDED' as ItemType }: ItemFormProps) {
  const isEdit = !!item;
  const createMutation = useCreateItemMutation();
  const updateMutation = useUpdateItemMutation();

  const [formData, setFormData] = useState<CreateItemForm>({
    tripId,
    name: '',
    type: defaultType,
    quantityNeeded: 1,
    isEssential: false,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        tripId: item.tripId,
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        ...(item.category ? { category: item.category } : {}),
        type: item.type,
        quantityNeeded: item.quantityNeeded,
        isEssential: item.isEssential,
      });
    } else {
      setFormData({
        tripId,
        name: '',
        type: defaultType,
        quantityNeeded: 1,
        isEssential: false,
      });
    }
  }, [item, tripId, defaultType, open]);

  const handleChange = (field: keyof CreateItemForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (isEdit && item) {
        const updateData: UpdateItemForm = {
          name: formData.name,
          ...(formData.description ? { description: formData.description } : {}),
          ...(formData.category ? { category: formData.category } : {}),
          type: formData.type,
          ...(formData.quantityNeeded ? { quantityNeeded: formData.quantityNeeded } : {}),
          ...(typeof formData.isEssential !== 'undefined' ? { isEssential: formData.isEssential } : {}),
        };
        await updateMutation.mutateAsync({ itemId: item.id, updateData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Item' : 'Add Item'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error">
              Failed to save item. Please try again.
            </Alert>
          )}

          <TextField
            label="Item Name"
            required
            fullWidth
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Tent, Sleeping Bag, Snacks"
          />

          <TextField
            label="Description"
            multiline
            rows={3}
            fullWidth
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Add any details about this item..."
          />

          <FormControl fullWidth>
            <InputLabel>Item Type</InputLabel>
            <Select
              value={formData.type}
              label="Item Type"
              onChange={(e) => handleChange('type', e.target.value as ItemType)}
            >
              <MenuItem value="RECOMMENDED">Recommended (Personal Checklist)</MenuItem>
              <MenuItem value="SHARED">Shared (Group Item)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category || ''}
              label="Category"
              onChange={(e) => handleChange('category', e.target.value || undefined)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {ITEM_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {formData.type === 'SHARED' && (
            <TextField
              label="Quantity Needed"
              type="number"
              required
              fullWidth
              value={formData.quantityNeeded}
              onChange={(e) => handleChange('quantityNeeded', Math.max(1, parseInt(e.target.value, 10) || 1))}
              inputProps={{ min: 1, max: 1000 }}
            />
          )}

          <FormControlLabel
            control={
              <Switch
                checked={formData.isEssential || false}
                onChange={(e) => handleChange('isEssential', e.target.checked)}
              />
            }
            label="Mark as essential"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isPending || !formData.name.trim()}
        >
          {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ItemForm;
