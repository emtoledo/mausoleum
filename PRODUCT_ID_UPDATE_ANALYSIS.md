# Product ID Update Analysis

## Current Usage of Product ID

The Product ID (`products.id`) is used as a **VARCHAR(100) PRIMARY KEY** and is referenced in multiple places:

### 1. Database References
- **`products` table**: Primary key (`id VARCHAR(100) PRIMARY KEY`)
- **`project_details` table**: Foreign reference (`product_id VARCHAR(100) NOT NULL`)
  - Every project stores which product it uses
  - Used to load product configuration when editing projects
- **`artwork_templates` table**: Foreign reference (`product_id VARCHAR(100)`)
  - Associates templates with products
  - Used to filter templates by product

### 2. Storage Paths
- **Product Images**: `products/${productId}/preview-${productId}.{ext}`
- **Product Images**: `products/${productId}/product-${productId}.{ext}`
- **Product Images**: `products/${productId}/overlay-${productId}.{ext}`
- Files are stored in Supabase Storage bucket `product-images`

### 3. Application Code References
- Project creation: Product ID is stored in `project_details.product_id`
- Template selection: Product ID is used to identify selected product
- Product lookups: `productService.getProductById(productId)`
- Template filtering: Templates filtered by `product_id`
- Storage operations: File paths constructed using product ID

## Risks of Updating Product ID

1. **Data Integrity**: Existing projects will reference the old product ID
2. **Storage Files**: Existing image files stored with old product ID path won't be found
3. **Template Associations**: Artwork templates linked to old product ID will break
4. **Product References**: Any hardcoded references in code/config will break

## Options for Safely Updating Product ID

### Option 1: Prevent Updates (Current Implementation) ✅ RECOMMENDED
**Approach**: Keep Product ID disabled for existing products (current behavior)

**Pros:**
- Simplest and safest
- Prevents accidental breaking changes
- No migration needed
- No risk to existing data

**Cons:**
- Cannot fix typos or rename products
- Requires deleting and recreating to change ID

**Implementation:**
- Current code already disables the field: `disabled={!!product}`
- No changes needed

**When to use:**
- Default approach for production
- When product IDs are stable identifiers

---

### Option 2: Cascade Update with Migration Script
**Approach**: Allow updates and automatically update all references

**Pros:**
- Allows fixing typos and renaming
- Maintains data integrity
- Updates all references atomically

**Cons:**
- Complex migration script required
- Risk of data loss if script fails
- Storage files need manual migration
- Requires database transaction support

**Implementation Steps:**
1. Create migration script that:
   - Updates `project_details.product_id` for all affected projects
   - Updates `artwork_templates.product_id` for all affected templates
   - Updates `products.available_templates` JSONB arrays (if they contain the old ID)
2. Migrate storage files:
   - Copy files from old path to new path
   - Update URLs in database
   - Delete old files (optional)
3. Add validation:
   - Check for existing projects using the product
   - Warn user before allowing update
   - Show count of affected records

**Database Migration Script:**
```sql
-- Example migration script (run in transaction)
BEGIN;

-- Update project_details
UPDATE project_details 
SET product_id = 'new-product-id'
WHERE product_id = 'old-product-id';

-- Update artwork_templates
UPDATE artwork_templates 
SET product_id = 'new-product-id'
WHERE product_id = 'old-product-id';

-- Update products.available_templates JSONB arrays
-- (More complex - need to replace old ID in arrays)

COMMIT;
```

**Storage Migration:**
- Manual process: Copy files from `products/old-id/` to `products/new-id/`
- Update URLs in database after migration

---

### Option 3: Alias/Redirect System
**Approach**: Keep old ID as alias, add new ID as primary

**Pros:**
- Zero downtime
- Backward compatible
- Can deprecate old IDs gradually

**Cons:**
- More complex schema
- Requires alias lookup logic
- More maintenance overhead

**Implementation:**
1. Add `product_aliases` table:
   ```sql
   CREATE TABLE product_aliases (
     old_id VARCHAR(100) PRIMARY KEY,
     current_id VARCHAR(100) REFERENCES products(id),
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```
2. Update lookup functions to check aliases first
3. Gradually migrate references to new ID
4. Remove aliases after migration complete

---

### Option 4: Soft Update with Warning System
**Approach**: Allow updates but warn about impact and require confirmation

**Pros:**
- User-friendly
- Allows updates when needed
- Shows impact before proceeding

**Cons:**
- Risk of user ignoring warnings
- Requires manual storage migration
- Partial updates possible (inconsistent state)

**Implementation:**
1. Before allowing update:
   - Query count of affected projects
   - Query count of affected templates
   - Show warning modal with counts
   - Require explicit confirmation
2. After confirmation:
   - Update database references
   - Show instructions for storage migration
   - Log the change for audit

**UI Flow:**
```
User changes Product ID → 
  Check for existing references → 
  Show warning modal: "This will affect X projects and Y templates" → 
  User confirms → 
  Update database → 
  Show storage migration instructions
```

---

### Option 5: UUID Migration (Long-term Solution)
**Approach**: Migrate from VARCHAR IDs to UUIDs

**Pros:**
- Industry standard
- No conflicts
- Better for distributed systems

**Cons:**
- Major migration required
- Breaks all existing references
- Requires full system migration
- Not suitable for quick fixes

**Implementation:**
- Complete schema redesign
- Full data migration
- Update all application code
- Migrate all storage paths

---

## Recommended Approach

**For Immediate Needs**: **Option 1** (Current - Prevent Updates)
- Safest and simplest
- No risk to production data
- If ID must change, delete and recreate product

**For Future Enhancement**: **Option 4** (Soft Update with Warnings)
- Add impact analysis before allowing updates
- Show affected projects/templates count
- Require explicit confirmation
- Provide storage migration instructions

**For Long-term**: Consider **Option 5** (UUID Migration)
- Plan as major system upgrade
- Requires comprehensive migration strategy

## Implementation Checklist (if allowing updates)

If implementing Option 2 or 4, ensure:

- [ ] Database migration script tested
- [ ] Storage file migration process documented
- [ ] Rollback plan prepared
- [ ] Impact analysis function implemented
- [ ] User warning/confirmation UI added
- [ ] Audit logging for ID changes
- [ ] Backup before migration
- [ ] Test in staging environment first

