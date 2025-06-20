-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'support');
CREATE TYPE ticket_status AS ENUM ('open', 'closed', 'pending', 'resolved');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_department AS ENUM ('sales', 'support', 'marketing', 'technical');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status ticket_status DEFAULT 'open',
    priority ticket_priority DEFAULT 'medium',
    department ticket_department DEFAULT 'support',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket messages table
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attachments table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure attachment belongs to either a ticket or a message, but not both
    CONSTRAINT attachment_belongs_to_one CHECK (
        (ticket_id IS NOT NULL AND message_id IS NULL) OR
        (ticket_id IS NULL AND message_id IS NOT NULL)
    )
);

-- Create indexes for better performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_department ON tickets(department);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_author_id ON ticket_messages(author_id);
CREATE INDEX idx_attachments_ticket_id ON attachments(ticket_id);
CREATE INDEX idx_attachments_message_id ON attachments(message_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Allow user creation during signup" ON users
    FOR INSERT WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

-- Admin and support can view all users
CREATE POLICY "Admin and support can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE clerk_id = auth.jwt() ->> 'sub' 
            AND role IN ('admin', 'support')
        )
    );

-- Tickets policies
CREATE POLICY "Users can view their own tickets" ON tickets
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can create their own tickets" ON tickets
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can update their own tickets" ON tickets
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    );

-- Admin and support can view all tickets
CREATE POLICY "Admin and support can view all tickets" ON tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE clerk_id = auth.jwt() ->> 'sub' 
            AND role IN ('admin', 'support')
        )
    );

-- Assigned users can view their assigned tickets
CREATE POLICY "Assigned users can view assigned tickets" ON tickets
    FOR SELECT USING (
        assigned_to IN (
            SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    );

-- Ticket messages policies
CREATE POLICY "Users can view messages on their tickets" ON ticket_messages
    FOR SELECT USING (
        ticket_id IN (
            SELECT id FROM tickets 
            WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
            )
        )
    );

CREATE POLICY "Users can create messages on their tickets" ON ticket_messages
    FOR INSERT WITH CHECK (
        ticket_id IN (
            SELECT id FROM tickets 
            WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
            )
        )
        AND author_id IN (
            SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    );

-- Admin and support can view all messages
CREATE POLICY "Admin and support can view all messages" ON ticket_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE clerk_id = auth.jwt() ->> 'sub' 
            AND role IN ('admin', 'support')
        )
    );

-- Attachments policies
CREATE POLICY "Users can view attachments on their tickets" ON attachments
    FOR SELECT USING (
        (ticket_id IN (
            SELECT id FROM tickets 
            WHERE user_id IN (
                SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
            )
        ))
        OR
        (message_id IN (
            SELECT tm.id FROM ticket_messages tm
            JOIN tickets t ON tm.ticket_id = t.id
            WHERE t.user_id IN (
                SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
            )
        ))
    );

CREATE POLICY "Users can upload attachments to their tickets" ON attachments
    FOR INSERT WITH CHECK (
        uploaded_by IN (
            SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
        AND (
            (ticket_id IN (
                SELECT id FROM tickets 
                WHERE user_id IN (
                    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
                )
            ))
            OR
            (message_id IN (
                SELECT tm.id FROM ticket_messages tm
                JOIN tickets t ON tm.ticket_id = t.id
                WHERE t.user_id IN (
                    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
                )
            ))
        )
    );

-- Admin and support can view all attachments
CREATE POLICY "Admin and support can view all attachments" ON attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE clerk_id = auth.jwt() ->> 'sub' 
            AND role IN ('admin', 'support')
        )
    );
