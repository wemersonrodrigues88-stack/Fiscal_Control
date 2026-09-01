# Fiscal Control

Sistema de gestão fiscal mensal com autenticação por perfil e persistência central compartilhada.

A interface da versão congelada é preservada. O estado operacional `fc_*` é sincronizado entre os usuários por D1 através do Worker, permitindo que alterações feitas por gerente, coordenador ou analista sejam compartilhadas entre dispositivos.

Validação obrigatória em dois dispositivos: gerente adiciona loja para analista; analista atualiza e confirma a carteira; depois repetir uma alteração no sentido inverso. Nenhuma nova funcionalidade visual deve ser adicionada enquanto a persistência estiver em validação.
