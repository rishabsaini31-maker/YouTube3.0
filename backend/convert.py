import os
import re

def convert_to_express(nextjs_code):
    code = nextjs_code
    
    # Remove NextRequest, NextResponse imports
    code = re.sub(r"import\s*\{\s*NextRequest\s*(?:,\s*NextResponse\s*)?\}\s*from\s*'next/server'.*\n", "", code)
    code = re.sub(r"import\s*\{\s*NextResponse\s*(?:,\s*NextRequest\s*)?\}\s*from\s*'next/server'.*\n", "", code)
    
    # Add express imports
    code = "import { Request, Response } from 'express';\n" + code
    
    # Replace handler signatures
    # export async function GET(request: NextRequest) {
    # export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    # We will replace them with standard functions that take req, res
    
    # Replace GET
    code = re.sub(r"export\s+async\s+function\s+GET\s*\(\s*request:\s*NextRequest\s*(?:,\s*\{\s*params\s*\}\s*:\s*\{.*?\}\s*)?\)\s*\{", 
                  "export const GET = async (req: Request, res: Response) => {", code)
    # Replace POST
    code = re.sub(r"export\s+async\s+function\s+POST\s*\(\s*request:\s*NextRequest\s*(?:,\s*\{\s*params\s*\}\s*:\s*\{.*?\}\s*)?\)\s*\{", 
                  "export const POST = async (req: Request, res: Response) => {", code)
    # Replace PUT
    code = re.sub(r"export\s+async\s+function\s+PUT\s*\(\s*request:\s*NextRequest\s*(?:,\s*\{\s*params\s*\}\s*:\s*\{.*?\}\s*)?\)\s*\{", 
                  "export const PUT = async (req: Request, res: Response) => {", code)
    # Replace DELETE
    code = re.sub(r"export\s+async\s+function\s+DELETE\s*\(\s*request:\s*NextRequest\s*(?:,\s*\{\s*params\s*\}\s*:\s*\{.*?\}\s*)?\)\s*\{", 
                  "export const DELETE = async (req: Request, res: Response) => {", code)
    
    # Replace params.id -> req.params.id
    code = code.replace("params.id", "req.params.id")
    # Replace searchParams -> req.query
    code = re.sub(r"const\s+\{\s*searchParams\s*\}\s*=\s*new\s*URL\s*\(\s*(?:request|req)\.url\s*\)", "", code)
    code = re.sub(r"searchParams\.get\(\s*'([^']+)'\s*\)", r"(req.query.\1 as string)", code)
    
    # Replace request.json() -> req.body
    code = re.sub(r"await\s+(?:request|req)\.json\(\)", "req.body", code)
    
    # Replace NextResponse.json(...) -> res.json(...)
    # Note: NextResponse.json(data, { status: 500 }) -> res.status(500).json(data)
    
    # Complex regex for NextResponse with status
    code = re.sub(r"return\s+NextResponse\.json\(\s*(.*?)\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)", r"return res.status(\2).json(\1)", code, flags=re.DOTALL)
    # Simple NextResponse
    code = re.sub(r"return\s+NextResponse\.json\(\s*(.*?)\s*\)", r"return res.json(\1)", code, flags=re.DOTALL)
    
    # Replace getServerSession(authOptions) -> req.user (we will assume auth middleware sets req.user)
    # This requires manual touchup, but we can do a rough replacement:
    code = re.sub(r"const\s+session\s*=\s*await\s+getServerSession\(authOptions\)", "const session = { user: (req as any).user };", code)
    
    return code

def process_directory(input_dir, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    index_exports = []
    
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            if file == "route.ts":
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, input_dir)
                
                # e.g. videos/[id]/route.ts
                route_path = os.path.dirname(rel_path)
                
                # We skip auth completely (NextAuth stays on frontend)
                if route_path.startswith("auth"):
                    continue
                
                out_name = route_path.replace("/", "_").replace("[", "").replace("]", "") + ".ts"
                out_path = os.path.join(output_dir, out_name)
                
                with open(full_path, 'r') as f:
                    content = f.read()
                
                converted = convert_to_express(content)
                
                with open(out_path, 'w') as f:
                    f.write(converted)
                
                print(f"Converted {rel_path} to {out_name}")

if __name__ == "__main__":
    process_directory("src/routes_nextjs", "src/controllers")
