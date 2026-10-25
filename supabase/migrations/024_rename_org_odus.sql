-- Renomear org do Wesley para Odus
update organizations
set name = 'Odus', slug = 'odus'
where owner_id = '82f70fb1-64da-483b-abc4-479f87908f86';
