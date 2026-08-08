const fs = require('fs');
const content = fs.readFileSync('src/components/InvoicePrint.tsx', 'utf-8');

const searchStr = `          <div className="text-center w-36">
            <p className="text-[#94A3B8] text-xs font-bold mb-6" style={{ color: '#94A3B8' }}>إمضاء الحسابات</p>
            <div className="border-b border-[#CBD5E1] w-full h-6" style={{ borderBottom: '1px solid #CBD5E1' }} />
          </div>
        </div>
      </div>
    </div>
  );
}`;

const replaceStr = `          <div className="text-center w-36">
            <p className="text-[#94A3B8] text-xs font-bold mb-6" style={{ color: '#94A3B8' }}>إمضاء الحسابات</p>
            <div className="border-b border-[#CBD5E1] w-full h-6" style={{ borderBottom: '1px solid #CBD5E1' }} />
          </div>
        </div>
      </div>

      {/* Developer Footer */}
      <div className="mt-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center break-inside-avoid flex flex-col sm:flex-row justify-between items-center gap-2" style={{ marginTop: '32px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="text-xs font-bold text-[#64748B]" dir="ltr" style={{ color: '#64748B', fontSize: '12px', fontWeight: 'bold', margin: 0 }}>ALL RIGHTS RESERVED © 2026</p>
        <p className="text-xs font-bold text-[#2180B2]" dir="ltr" style={{ color: '#2180B2', fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Developed by Fox Tech</p>
        <p className="text-xs font-bold text-[#64748B]" dir="ltr" style={{ color: '#64748B', fontSize: '12px', fontWeight: 'bold', margin: 0 }}>📞 01034859313</p>
      </div>
    </div>
  );
}`;

if (content.includes(searchStr)) {
  fs.writeFileSync('src/components/InvoicePrint.tsx', content.replace(searchStr, replaceStr));
  console.log("Success");
} else {
  console.log("Not found");
}
