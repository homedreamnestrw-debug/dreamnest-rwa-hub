export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      business_settings: {
        Row: {
          address: string | null
          business_name: string
          city: string | null
          country: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          loyalty_points_rate: number
          loyalty_redemption_rate: number
          loyalty_tiers: Json | null
          phone: string | null
          receipt_footer: string | null
          receipt_header: string | null
          receipt_logo_url: string | null
          shop_enabled: boolean
          smtp_host: string | null
          smtp_port: number | null
          smtp_user: string | null
          tagline: string | null
          updated_at: string
          vat_percentage: number
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          loyalty_points_rate?: number
          loyalty_redemption_rate?: number
          loyalty_tiers?: Json | null
          phone?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          receipt_logo_url?: string | null
          shop_enabled?: boolean
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          tagline?: string | null
          updated_at?: string
          vat_percentage?: number
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          loyalty_points_rate?: number
          loyalty_redemption_rate?: number
          loyalty_tiers?: Json | null
          phone?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          receipt_logo_url?: string | null
          shop_enabled?: boolean
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          tagline?: string | null
          updated_at?: string
          vat_percentage?: number
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          notes: string | null
          phone: string | null
          shipping_address: string | null
          source: string
          tin: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          shipping_address?: string | null
          source?: string
          tin?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          shipping_address?: string | null
          source?: string
          tin?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creative_assets: {
        Row: {
          asset_type: string
          caption: string | null
          config: Json
          created_at: string
          created_by: string | null
          download_count: number
          id: string
          platform_format: string | null
          product_id: string | null
          style_variant: string | null
          template_key: string | null
        }
        Insert: {
          asset_type: string
          caption?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          download_count?: number
          id?: string
          platform_format?: string | null
          product_id?: string | null
          style_variant?: string | null
          template_key?: string | null
        }
        Update: {
          asset_type?: string
          caption?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          download_count?: number
          id?: string
          platform_format?: string | null
          product_id?: string | null
          style_variant?: string | null
          template_key?: string | null
        }
        Relationships: []
      }
      creative_performance: {
        Row: {
          asset_id: string
          comments: number
          created_at: string
          created_by: string | null
          id: string
          likes: number
          notes: string | null
          platform: string
          posted_at: string | null
          sales_attributed: number
          shares: number
        }
        Insert: {
          asset_id: string
          comments?: number
          created_at?: string
          created_by?: string | null
          id?: string
          likes?: number
          notes?: string | null
          platform: string
          posted_at?: string | null
          sales_attributed?: number
          shares?: number
        }
        Update: {
          asset_id?: string
          comments?: number
          created_at?: string
          created_by?: string | null
          id?: string
          likes?: number
          notes?: string | null
          platform?: string
          posted_at?: string | null
          sales_attributed?: number
          shares?: number
        }
        Relationships: [
          {
            foreignKeyName: "creative_performance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "creative_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_by: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gift_vouchers: {
        Row: {
          amount: number
          balance: number
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string | null
          code: string
          created_at: string
          expires_at: string
          id: string
          payment_approved: boolean
          payment_approved_at: string | null
          payment_approved_by: string | null
          payment_method: string
          payment_status: string
          personal_message: string | null
          recipient_email: string | null
          recipient_name: string
          recipient_phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          balance: number
          buyer_email?: string | null
          buyer_name: string
          buyer_phone?: string | null
          code: string
          created_at?: string
          expires_at: string
          id?: string
          payment_approved?: boolean
          payment_approved_at?: string | null
          payment_approved_by?: string | null
          payment_method: string
          payment_status?: string
          personal_message?: string | null
          recipient_email?: string | null
          recipient_name: string
          recipient_phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          payment_approved?: boolean
          payment_approved_at?: string | null
          payment_approved_by?: string | null
          payment_method?: string
          payment_status?: string
          personal_message?: string | null
          recipient_email?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_audit_log: {
        Row: {
          changed_by: string | null
          created_at: string
          field_name: string
          id: string
          invoice_id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          field_name: string
          id?: string
          invoice_id: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          field_name?: string
          id?: string
          invoice_id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_audit_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          tax: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          tax?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          tax?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string | null
          discount: number
          document_number: string
          document_type: Database["public"]["Enums"]["document_type"]
          due_date: string | null
          id: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["document_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          document_number: string
          document_type?: Database["public"]["Enums"]["document_type"]
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          document_number?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points_log: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          total: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at: string
          customer_id: string | null
          discount_amount: number
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          location_id: string | null
          notes: string | null
          order_number: number
          payment_approved: boolean
          payment_approved_at: string | null
          payment_approved_by: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          served_by: string | null
          shipping_address: string | null
          shipping_city: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["sale_channel"]
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_number?: number
          payment_approved?: boolean
          payment_approved_at?: string | null
          payment_approved_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          served_by?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["sale_channel"]
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_number?: number
          payment_approved?: boolean
          payment_approved_at?: string | null
          payment_approved_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          served_by?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          created_at: string
          id: string
          location_id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json | null
          barcode: string | null
          created_at: string
          id: string
          is_active: boolean
          price_override: number | null
          product_id: string
          sku: string | null
          stock_quantity: number
          updated_at: string
          variant_name: string
        }
        Insert: {
          attributes?: Json | null
          barcode?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_override?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          variant_name: string
        }
        Update: {
          attributes?: Json | null
          barcode?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_override?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          featured: boolean
          id: string
          images: string[] | null
          is_active: boolean
          low_stock_threshold: number
          name: string
          price: number
          sku: string | null
          slug: string
          stock_quantity: number
          tax_enabled: boolean
          updated_at: string
          variant_attributes: Json
        }
        Insert: {
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          images?: string[] | null
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          price?: number
          sku?: string | null
          slug: string
          stock_quantity?: number
          tax_enabled?: boolean
          updated_at?: string
          variant_attributes?: Json
        }
        Update: {
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          images?: string[] | null
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          sku?: string | null
          slug?: string
          stock_quantity?: number
          tax_enabled?: boolean
          updated_at?: string
          variant_attributes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          loyalty_points: number
          phone: string | null
          shipping_address: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          loyalty_points?: number
          phone?: string | null
          shipping_address?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          loyalty_points?: number
          phone?: string | null
          shipping_address?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          total: number
          unit_cost: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          total?: number
          unit_cost?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          total?: number
          unit_cost?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          po_number: string
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number
          supplier_id: string
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          po_number: string
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id?: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_stock: number
          performed_by: string | null
          previous_stock: number
          product_id: string | null
          quantity: number
          reason: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_stock?: number
          performed_by?: string | null
          previous_stock?: number
          product_id?: string | null
          quantity: number
          reason?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          new_stock?: number
          performed_by?: string | null
          previous_stock?: number
          product_id?: string | null
          quantity?: number
          reason?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variant_stock: {
        Row: {
          id: string
          location_id: string
          quantity: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          id?: string
          location_id: string
          quantity?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          id?: string
          location_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_stock_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_redemptions: {
        Row: {
          amount_used: number
          created_at: string
          id: string
          order_id: string
          voucher_id: string
        }
        Insert: {
          amount_used: number
          created_at?: string
          id?: string
          order_id: string
          voucher_id: string
        }
        Update: {
          amount_used?: number
          created_at?: string
          id?: string
          order_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "gift_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      website_content: {
        Row: {
          content_key: string
          content_value: string
          id: string
          updated_at: string
        }
        Insert: {
          content_key: string
          content_value?: string
          id?: string
          updated_at?: string
        }
        Update: {
          content_key?: string
          content_value?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      products_public: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          id: string | null
          images: string[] | null
          is_active: boolean | null
          low_stock_threshold: number | null
          name: string | null
          price: number | null
          sku: string | null
          slug: string | null
          stock_quantity: number | null
          tax_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string | null
          price?: number | null
          sku?: string | null
          slug?: string | null
          stock_quantity?: number | null
          tax_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string | null
          price?: number | null
          sku?: string | null
          slug?: string | null
          stock_quantity?: number | null
          tax_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_variant_stock: {
        Args: {
          p_location_id: string
          p_movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          p_new_quantity: number
          p_reason?: string
          p_variant_id: string
        }
        Returns: undefined
      }
      approve_order_payment: { Args: { order_id: string }; Returns: undefined }
      create_guest_order: {
        Args: { p_items: Json; p_order: Json }
        Returns: {
          id: string
          order_number: number
        }[]
      }
      generate_voucher_code: { Args: never; Returns: string }
      get_public_business_settings: {
        Args: never
        Returns: {
          address: string
          business_name: string
          city: string
          country: string
          created_at: string
          currency: string
          email: string
          id: string
          logo_url: string
          loyalty_points_rate: number
          loyalty_redemption_rate: number
          loyalty_tiers: Json
          phone: string
          receipt_footer: string
          receipt_header: string
          receipt_logo_url: string
          shop_enabled: boolean
          tagline: string
          updated_at: string
          vat_percentage: number
          whatsapp_number: string
        }[]
      }
      get_public_website_content: {
        Args: never
        Returns: {
          content_key: string
          content_value: string
        }[]
      }
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_voucher: {
        Args: { p_amount: number; p_order_id: string; p_voucher_code: string }
        Returns: string
      }
      reject_order_payment: {
        Args: { order_id: string; rejection_note?: string }
        Returns: undefined
      }
      transfer_stock: {
        Args: {
          p_from_location: string
          p_product_id: string
          p_quantity: number
          p_to_location: string
        }
        Returns: undefined
      }
      transfer_variant_stock: {
        Args: {
          p_from_location: string
          p_quantity: number
          p_to_location: string
          p_variant_id: string
        }
        Returns: undefined
      }
      validate_voucher: {
        Args: { voucher_code: string }
        Returns: {
          balance: number
          code: string
          expires_at: string
          id: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer"
      document_status:
        | "draft"
        | "sent"
        | "paid"
        | "overdue"
        | "cancelled"
        | "accepted"
        | "declined"
        | "expired"
      document_type: "invoice" | "proforma" | "receipt" | "quote"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method:
        | "cash"
        | "card"
        | "mtn_momo"
        | "airtel_money"
        | "stripe"
        | "voucher"
      payment_status: "unpaid" | "partial" | "paid" | "refunded"
      po_status: "draft" | "sent" | "received" | "cancelled"
      sale_channel: "online" | "in_store"
      stock_movement_type:
        | "sale"
        | "restock"
        | "adjustment"
        | "return"
        | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "customer"],
      document_status: [
        "draft",
        "sent",
        "paid",
        "overdue",
        "cancelled",
        "accepted",
        "declined",
        "expired",
      ],
      document_type: ["invoice", "proforma", "receipt", "quote"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: [
        "cash",
        "card",
        "mtn_momo",
        "airtel_money",
        "stripe",
        "voucher",
      ],
      payment_status: ["unpaid", "partial", "paid", "refunded"],
      po_status: ["draft", "sent", "received", "cancelled"],
      sale_channel: ["online", "in_store"],
      stock_movement_type: [
        "sale",
        "restock",
        "adjustment",
        "return",
        "transfer",
      ],
    },
  },
} as const
